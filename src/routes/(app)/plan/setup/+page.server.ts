import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ARS_WHOLE_MESSAGE, formatAmountInput, isWholeFor, parseAmount } from '$lib/money';
import { listAccounts } from '$lib/server/accounts-queries';
import { listCategories } from '$lib/server/categories-queries';
import { singleCurrency } from '$lib/server/currency-pref';
import type { Currency } from '$lib/server/dashboard';
import { isUuid } from '$lib/server/db/util';
import { currentMonth, monthLabel } from '$lib/server/month';
import {
	isRecurringActive,
	lastFullMonths,
	parseRecurringForm,
	planSpent,
	savingsFor
} from '$lib/server/plan';
import {
	deletePlan,
	getPlan,
	listRecurring,
	monthOutcomes,
	PlanRejected,
	planLimits,
	recurringCandidates,
	savePlan,
	type RecurringRow
} from '$lib/server/plan-queries';

const candidateKey = (c: {
	type: string;
	description: string;
	accountId: string;
	categoryId: string | null;
}) => `${c.type}|${c.accountId}|${c.categoryId}|${c.description.toLowerCase()}`;

/** Integer cents rounded half up to whole units (pesos or dollars). */
const wholeUnits = (cents: number) => Math.floor((cents + 50) / 100) * 100;

async function context(userId: string, cur: Currency, ym: string) {
	const [accountRows, categories, rules, rawCandidates] = await Promise.all([
		listAccounts(userId, { currency: cur }),
		listCategories(userId),
		listRecurring(userId, cur),
		recurringCandidates(userId, cur, lastFullMonths(ym))
	]);
	const active = rules.filter(isRecurringActive);
	const ruleNames = new Set(active.map((r) => `${r.type}|${r.description.toLowerCase()}`));
	const candidates = rawCandidates
		.filter((c) => c.categoryId && !ruleNames.has(`${c.type}|${c.description.toLowerCase()}`))
		.map((c) => ({
			key: candidateKey(c),
			type: c.type as 'income' | 'outcome',
			description: c.description.slice(0, 60),
			// Averages are not always whole; ARS rules are whole pesos.
			amount: cur === 'ARS' ? wholeUnits(c.amount) : c.amount,
			dayOfMonth: Math.min(Math.max(c.dayOfMonth, 1), 31),
			accountId: c.accountId,
			categoryId: c.categoryId!,
			accountName: accountRows.find((a) => a.id === c.accountId)?.name ?? '',
			categoryName: categories.find((k) => k.id === c.categoryId)?.name ?? ''
		}))
		.filter((c) => c.amount > 0 && c.accountName && c.categoryName);
	return { accounts: accountRows, categories, active, candidates };
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const userId = locals.user!.id;
	const currency = singleCurrency(cookies.get('currency'));
	const ym = currentMonth(new Date());
	const ctx = await context(userId, currency, ym);
	if (ctx.accounts.length === 0) redirect(303, '/plan');

	const [[plan], rows] = await Promise.all([
		getPlan(userId, currency),
		monthOutcomes(userId, currency, lastFullMonths(ym))
	]);
	const limits = plan ? await planLimits(userId, plan.id) : [];
	// Suggested limit: 3-month average of spending outside active rules, in whole units (integer math).
	const spent = planSpent(rows, new Set(ctx.active.map((r) => r.id)));

	return {
		currency,
		monthName: monthLabel(ym, false).toLowerCase(),
		accounts: ctx.accounts.map((a) => ({ id: a.id, name: a.name })),
		categories: ctx.categories.map((c) => ({
			id: c.id,
			name: c.name,
			suggested: Math.floor(((spent.byCategory.get(c.id) ?? 0) + 150) / 300) * 100,
			limit: limits.find((l) => l.categoryId === c.id)?.amount ?? null
		})),
		rules: ctx.active.map((r) => ({
			id: r.id,
			type: r.type,
			description: r.description,
			amount: r.amount,
			dayOfMonth: r.dayOfMonth,
			accountName: r.accountName
		})),
		candidates: ctx.candidates,
		plan: plan
			? {
					extraIncome: plan.extraIncome,
					savings: plan.savings,
					repeats: plan.month === null,
					// An ended one-month plan is offered as "Crear plan" on /plan, so the title matches.
					current: plan.month === null || plan.month === ym
				}
			: null,
		formatted: {
			extraIncome: plan?.extraIncome ? formatAmountInput(plan.extraIncome, currency) : ''
		}
	};
};

const LIMIT_KEY = /^limit_([0-9a-f-]{36})$/i;

export const actions: Actions = {
	save: async ({ locals, cookies, request }) => {
		const userId = locals.user!.id;
		const currency = singleCurrency(cookies.get('currency'));
		const ym = currentMonth(new Date());
		const fd = await request.formData();
		const ctx = await context(userId, currency, ym);
		const error = (step: number, message: string) => fail(400, { step, message });
		const strings = (k: string) => fd.getAll(k).filter((v): v is string => typeof v === 'string');

		// Existing rules: only rules the form showed (`shown`) and the user left unchecked are archived.
		// A rule created after the form loaded is not in `shown`, so it stays active. `ctx.active` holds
		// only the user's own active rules, so unknown or foreign posted ids are ignored.
		const keep = new Set(strings('keep'));
		const shown = new Set(strings('shown'));
		const archiveIds = ctx.active
			.filter((r) => shown.has(r.id) && !keep.has(r.id))
			.map((r) => r.id);
		const keptRules = ctx.active.filter((r) => keep.has(r.id));

		// Detected candidates the user accepted, re-derived on the server.
		const accepted = new Set(strings('candidate'));
		const newRules: RecurringRow[] = ctx.candidates
			.filter((c) => accepted.has(c.key))
			.map(({ type, description, amount, accountId, categoryId, dayOfMonth }) => ({
				type,
				description,
				amount,
				accountId,
				categoryId,
				dayOfMonth
			}));

		// Rows typed in the wizard: parallel arrays, blank descriptions are ignored.
		const cols = ['type', 'description', 'amount', 'accountId', 'categoryId', 'dayOfMonth'];
		const rows = cols.map((c) => strings(`new_${c}`));
		for (let i = 0; i < rows[1].length; i++) {
			if (!rows[1][i]?.trim()) continue;
			const row = new FormData();
			cols.forEach((c, j) => row.set(c, rows[j][i] ?? ''));
			const step = rows[0][i] === 'income' ? 1 : 2;
			const parsed = parseRecurringForm(row);
			if (!parsed.ok)
				return error(step, `Revisá “${rows[1][i].trim()}”: ${Object.values(parsed.errors)[0]}`);
			if (!ctx.accounts.some((a) => a.id === parsed.data.accountId))
				return error(step, `Elegí una cuenta en ${currency} para “${parsed.data.description}”.`);
			if (!ctx.categories.some((c) => c.id === parsed.data.categoryId))
				return error(step, `Elegí una categoría para “${parsed.data.description}”.`);
			if (!isWholeFor(parsed.data.amount, currency))
				return error(step, `Revisá “${parsed.data.description}”: ${ARS_WHOLE_MESSAGE}`);
			newRules.push(parsed.data);
		}

		/** Empty is 0; otherwise a non-negative amount (whole pesos in ARS). */
		const money = (raw: string): { ok: true; cents: number } | { ok: false; whole: boolean } => {
			const t = raw.trim();
			if (t === '') return { ok: true, cents: 0 };
			const cents = parseAmount(t);
			if (cents === null || cents < 0) return { ok: false, whole: false };
			return isWholeFor(cents, currency) ? { ok: true, cents } : { ok: false, whole: true };
		};
		const text = (k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string) : '');

		const extra = money(text('extraIncome'));
		if (!extra.ok)
			return error(
				1,
				extra.whole
					? `Revisá “Otros ingresos”: ${ARS_WHOLE_MESSAGE}`
					: 'Ingresá un monto válido en “Otros ingresos”.'
			);
		const extraIncome = extra.cents;

		const income =
			[...keptRules, ...newRules]
				.filter((r) => r.type === 'income')
				.reduce((a, r) => a + r.amount, 0) + extraIncome;
		const option = text('savingsOption') || '0';
		const fixed = money(text('savingsFixed'));
		if (option === 'fixed' && !fixed.ok)
			return error(
				3,
				fixed.whole
					? `Revisá “Monto a ahorrar”: ${ARS_WHOLE_MESSAGE}`
					: 'Ingresá un monto de ahorro válido.'
			);
		const savings = savingsFor(option, income, fixed.ok ? fixed.cents : null);

		// Every limit_<uuid> key is kept as sent; the ownership check is inside the transaction.
		const limitMap = new Map<string, number>();
		for (const [key, value] of fd.entries()) {
			const m = LIMIT_KEY.exec(key);
			if (!m || typeof value !== 'string' || value.trim() === '') continue;
			const id = m[1].toLowerCase();
			if (!isUuid(id)) return error(4, 'Elegí una categoría válida para cada límite.');
			const name = ctx.categories.find((c) => c.id === id)?.name ?? 'esa categoría';
			const cents = parseAmount(value);
			if (cents === null || cents <= 0) return error(4, `Ingresá un límite válido para ${name}.`);
			if (!isWholeFor(cents, currency))
				return error(4, `Revisá el límite de ${name}: ${ARS_WHOLE_MESSAGE}`);
			limitMap.set(id, cents);
		}
		const limits = [...limitMap].map(([categoryId, amount]) => ({ categoryId, amount }));

		try {
			await savePlan(userId, currency, {
				extraIncome,
				savings,
				month: fd.get('repeat') === 'on' ? null : ym,
				limits,
				newRules,
				archiveIds
			});
		} catch (e) {
			if (e instanceof PlanRejected) return error(e.step, e.message);
			throw e;
		}
		redirect(303, '/plan?planSaved=1');
	},
	delete: async ({ locals, cookies }) => {
		await deletePlan(locals.user!.id, singleCurrency(cookies.get('currency')));
		redirect(303, '/plan');
	}
};
