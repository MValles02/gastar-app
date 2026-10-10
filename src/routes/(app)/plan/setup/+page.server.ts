import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ARS_WHOLE_MESSAGE, formatAmountInput, isWholeFor, parseAmount } from '$lib/money';
import { savingsFor } from '$lib/savings';
import { listAccounts } from '$lib/server/accounts-queries';
import { listCategories } from '$lib/server/categories-queries';
import { preferredCurrency } from '$lib/server/currency-pref';
import type { Currency } from '$lib/money';
import { isUuid } from '$lib/server/db/util';
import { currentMonth, monthLabel } from '$lib/server/month';
import {
	HISTORY_MONTHS,
	isRecurringActive,
	lastFullMonths,
	MAX_DAY_OF_MONTH,
	parseRecurringForm,
	PLAN_STEP,
	planSpent
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

/** Monthly average of a `HISTORY_MONTHS` total, rounded half up to whole units (integer math). */
const monthlyAverage = (total: number) =>
	Math.floor((total + 50 * HISTORY_MONTHS) / (100 * HISTORY_MONTHS)) * 100;

/** Accounts in `cur`, categories, the active rules and the suggested new rules the wizard offers. */
async function setupContext(userId: string, cur: Currency, ym: string) {
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
			description: c.description.slice(0, DESCRIPTION_MAX_LENGTH),
			// Averages are not always whole; ARS rules are whole pesos.
			amount: cur === 'ARS' ? wholeUnits(c.amount) : c.amount,
			dayOfMonth: Math.min(Math.max(c.dayOfMonth, 1), MAX_DAY_OF_MONTH),
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
	const currency = preferredCurrency(cookies);
	const ym = currentMonth(new Date());
	const ctx = await setupContext(userId, currency, ym);
	if (ctx.accounts.length === 0) redirect(303, '/plan');

	const [[plan], rows] = await Promise.all([
		getPlan(userId, currency),
		monthOutcomes(userId, currency, lastFullMonths(ym))
	]);
	const limits = plan ? await planLimits(userId, plan.id) : [];
	// Suggested limit: monthly average of spending outside active rules.
	const spent = planSpent(rows, new Set(ctx.active.map((r) => r.id)));

	return {
		currency,
		monthName: monthLabel(ym, false).toLowerCase(),
		accounts: ctx.accounts.map((a) => ({ id: a.id, name: a.name })),
		categories: ctx.categories.map((c) => ({
			id: c.id,
			name: c.name,
			kind: c.kind,
			suggested: monthlyAverage(spent.byCategory.get(c.id) ?? 0),
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

type SetupContext = Awaited<ReturnType<typeof setupContext>>;
/** A rejected save: the message and the wizard step to show it on. */
type StepError = { step: number; message: string };

const LIMIT_KEY = /^limit_([0-9a-f-]{36})$/i;
/** Rows typed in the wizard are posted as parallel `new_<field>` arrays, one entry per row. */
const NEW_ROW_FIELDS = ['type', 'description', 'amount', 'accountId', 'categoryId', 'dayOfMonth'];

const strings = (fd: FormData, key: string) =>
	fd.getAll(key).filter((v): v is string => typeof v === 'string');

const text = (fd: FormData, key: string) => {
	const v = fd.get(key);
	return typeof v === 'string' ? v : '';
};

/**
 * Existing rules: only rules the form showed (`shown`) and the user left unchecked are archived.
 * A rule created after the form loaded is not in `shown`, so it stays active. `active` holds only
 * the user's own active rules, so unknown or foreign posted ids are ignored.
 */
function existingRuleChoices(fd: FormData, active: SetupContext['active']) {
	const keep = new Set(strings(fd, 'keep'));
	const shown = new Set(strings(fd, 'shown'));
	return {
		archiveIds: active.filter((r) => shown.has(r.id) && !keep.has(r.id)).map((r) => r.id),
		keptRules: active.filter((r) => keep.has(r.id))
	};
}

/** Detected candidates the user accepted, re-derived on the server. */
function acceptedCandidates(fd: FormData, candidates: SetupContext['candidates']): RecurringRow[] {
	const accepted = new Set(strings(fd, 'candidate'));
	return candidates
		.filter((c) => accepted.has(c.key))
		.map(({ type, description, amount, accountId, categoryId, dayOfMonth }) => ({
			type,
			description,
			amount,
			accountId,
			categoryId,
			dayOfMonth
		}));
}

/** Rows typed in the wizard, validated like the recurring form; blank descriptions are ignored. */
function typedRules(
	fd: FormData,
	ctx: SetupContext,
	currency: Currency
): { rules: RecurringRow[] } | { error: StepError } {
	const columns = NEW_ROW_FIELDS.map((f) => strings(fd, `new_${f}`));
	const [types, descriptions] = columns;
	const rules: RecurringRow[] = [];
	for (let i = 0; i < descriptions.length; i++) {
		const label = descriptions[i]?.trim();
		if (!label) continue;
		const row = new FormData();
		NEW_ROW_FIELDS.forEach((f, j) => row.set(f, columns[j][i] ?? ''));
		const step = types[i] === 'income' ? PLAN_STEP.income : PLAN_STEP.bills;
		const reject = (message: string) => ({ error: { step, message } });

		const parsed = parseRecurringForm(row);
		if (!parsed.ok) return reject(`Revisá “${label}”: ${Object.values(parsed.errors)[0]}`);
		const { data } = parsed;
		if (!ctx.accounts.some((a) => a.id === data.accountId))
			return reject(`Elegí una cuenta en ${currency} para “${data.description}”.`);
		if (
			!ctx.categories.some(
				(c) => c.id === data.categoryId && (c.kind === null || c.kind === data.type)
			)
		)
			return reject(`Elegí una categoría para “${data.description}”.`);
		if (!isWholeFor(data.amount, currency))
			return reject(`Revisá “${data.description}”: ${ARS_WHOLE_MESSAGE}`);
		rules.push(data);
	}
	return { rules };
}

/**
 * An optional amount field: empty is 0; otherwise a non-negative amount (whole pesos in ARS).
 * `label` names the field in the whole-pesos message; `invalid` is the message for anything else.
 */
function optionalAmount(
	raw: string,
	currency: Currency,
	{ label, invalid }: { label: string; invalid: string }
): { cents: number } | { message: string } {
	const t = raw.trim();
	if (t === '') return { cents: 0 };
	const cents = parseAmount(t);
	if (cents === null || cents < 0) return { message: invalid };
	if (!isWholeFor(cents, currency)) return { message: `Revisá “${label}”: ${ARS_WHOLE_MESSAGE}` };
	return { cents };
}

/** Every non-empty limit_<uuid> field, kept as sent; the ownership check is inside the transaction. */
function parseLimits(
	fd: FormData,
	ctx: SetupContext,
	currency: Currency
): { limits: { categoryId: string; amount: number }[] } | { error: StepError } {
	const reject = (message: string) => ({ error: { step: PLAN_STEP.summary, message } });
	const byCategory = new Map<string, number>();
	for (const [key, value] of fd.entries()) {
		const m = LIMIT_KEY.exec(key);
		if (!m || typeof value !== 'string' || value.trim() === '') continue;
		const id = m[1].toLowerCase();
		if (!isUuid(id)) return reject('Elegí una categoría válida para cada límite.');
		const name = ctx.categories.find((c) => c.id === id)?.name ?? 'esa categoría';
		const cents = parseAmount(value);
		if (cents === null || cents <= 0) return reject(`Ingresá un límite válido para ${name}.`);
		if (!isWholeFor(cents, currency))
			return reject(`Revisá el límite de ${name}: ${ARS_WHOLE_MESSAGE}`);
		byCategory.set(id, cents);
	}
	return { limits: [...byCategory].map(([categoryId, amount]) => ({ categoryId, amount })) };
}

export const actions: Actions = {
	save: async ({ locals, cookies, request }) => {
		const userId = locals.user!.id;
		const currency = preferredCurrency(cookies);
		const ym = currentMonth(new Date());
		const fd = await request.formData();
		const ctx = await setupContext(userId, currency, ym);
		const reject = (e: StepError) => fail(400, e);

		const { archiveIds, keptRules } = existingRuleChoices(fd, ctx.active);
		const typed = typedRules(fd, ctx, currency);
		if ('error' in typed) return reject(typed.error);
		const newRules = [...acceptedCandidates(fd, ctx.candidates), ...typed.rules];

		const extra = optionalAmount(text(fd, 'extraIncome'), currency, {
			label: 'Otros ingresos',
			invalid: 'Ingresá un monto válido en “Otros ingresos”.'
		});
		if ('message' in extra) return reject({ step: PLAN_STEP.income, message: extra.message });
		const extraIncome = extra.cents;

		const income =
			[...keptRules, ...newRules]
				.filter((r) => r.type === 'income')
				.reduce((a, r) => a + r.amount, 0) + extraIncome;
		const option = text(fd, 'savingsOption') || '0';
		// The fixed amount is only read (and validated) when it is the chosen option.
		let fixed: number | null = null;
		if (option === 'fixed') {
			const r = optionalAmount(text(fd, 'savingsFixed'), currency, {
				label: 'Monto a ahorrar',
				invalid: 'Ingresá un monto de ahorro válido.'
			});
			if ('message' in r) return reject({ step: PLAN_STEP.savings, message: r.message });
			fixed = r.cents;
		}
		const savings = savingsFor(option, income, fixed);

		const parsedLimits = parseLimits(fd, ctx, currency);
		if ('error' in parsedLimits) return reject(parsedLimits.error);

		try {
			await savePlan(userId, currency, {
				extraIncome,
				savings,
				month: fd.get('repeat') === 'on' ? null : ym,
				limits: parsedLimits.limits,
				newRules,
				archiveIds
			});
		} catch (e) {
			if (e instanceof PlanRejected) return reject({ step: e.step, message: e.message });
			throw e;
		}
		redirect(303, '/plan?planSaved=1');
	},
	delete: async ({ locals, cookies }) => {
		await deletePlan(locals.user!.id, preferredCurrency(cookies));
		redirect(303, '/plan');
	}
};
