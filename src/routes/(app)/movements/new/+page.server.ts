import { fail, redirect } from '@sveltejs/kit';
import { pgErrorCode } from '$lib/server/db/errors';
import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';
import { toIconKey, toSwatchKey } from '$lib/appearance';
import { getAccount, listAccounts } from '$lib/server/accounts-queries';
import { getCategory, listCategories } from '$lib/server/categories-queries';
import { isUuid } from '$lib/server/db/util';
import { formatAmountInput } from '$lib/money';
import { localDay } from '$lib/server/month';
import { parseMovementForm, resolveMovement, UNAVAILABLE_MESSAGE } from '$lib/server/movements';
import { createMovement } from '$lib/server/movements-queries';
import { isRecurringActive } from '$lib/server/plan';
import { listRecurring } from '$lib/server/plan-queries';

/** An active recurring rule owned by the user, or undefined (inactive, foreign and invalid ids alike). */
async function findRule(userId: string, id: FormDataEntryValue | null) {
	if (typeof id !== 'string' || !isUuid(id)) return undefined;
	const [rule] = await listRecurring(userId, undefined, id);
	return rule && isRecurringActive(rule) ? rule : undefined;
}

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = locals.user!.id;
	const [accountRows, categoryRows] = await Promise.all([
		listAccounts(userId),
		listCategories(userId)
	]);
	const accounts = accountRows.map((a) => ({
		id: a.id,
		name: a.name,
		icon: toIconKey(a.icon),
		color: toSwatchKey(a.color),
		meta: a.currency,
		currency: a.currency
	}));
	const categories = categoryRows.map((c) => ({
		id: c.id,
		name: c.name,
		icon: 'categories' as const,
		color: toSwatchKey(c.color)
	}));
	const rule = await findRule(userId, url.searchParams.get('recurring'));
	const last = cookies.get('last_account');
	const defaultAccountId = accounts.some((a) => a.id === last)
		? last!
		: accounts.length === 1
			? accounts[0].id
			: '';
	const now = localDay(new Date());
	return {
		accounts,
		categories,
		now,
		recurring: rule
			? {
					id: rule.id,
					description: rule.description,
					initial: {
						type: rule.type,
						amount: formatAmountInput(rule.amount, rule.currency),
						description: rule.description,
						accountId: rule.accountId,
						destinationAccountId: '',
						exchangeRate: '',
						categoryId: rule.categoryId,
						occurredAt: now
					}
				}
			: null,
		saved: url.searchParams.get('saved') === '1',
		formKey: crypto.randomUUID(),
		defaultAccountId
	};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();
		const parsed = parseMovementForm(fd);
		const { values } = parsed;
		if (!parsed.ok) return fail(400, { values, errors: parsed.errors });
		const { data } = parsed;

		const [origin, destination, category] = await Promise.all([
			getAccount(userId, data.accountId),
			data.type === 'transfer' && data.destinationAccountId
				? getAccount(userId, data.destinationAccountId)
				: Promise.resolve([]),
			data.type !== 'transfer' && data.categoryId
				? getCategory(userId, data.categoryId)
				: Promise.resolve([])
		]);
		const resolved = resolveMovement(data, {
			origin: origin[0],
			destination: destination[0],
			category: category[0]
		});
		if (!resolved.ok) return fail(400, { values, errors: resolved.errors });

		const rule = await findRule(userId, fd.get('recurringId'));
		if (rule) {
			if (data.type !== rule.type)
				return fail(400, {
					values,
					errors: {
						type: `Este pago es un ${rule.type === 'income' ? 'ingreso' : 'gasto'}.`
					}
				});
			if (origin[0].currency !== rule.currency)
				return fail(400, {
					values,
					errors: {
						accountId: `Elegí una cuenta en ${rule.currency} para registrar este pago.`
					}
				});
		}

		try {
			await createMovement(userId, { ...resolved.row, recurringId: rule?.id ?? null });
		} catch (e) {
			const code = pgErrorCode(e);
			if (code === '23503')
				return fail(400, { values, errors: { accountId: UNAVAILABLE_MESSAGE } });
			throw e;
		}
		cookies.set('last_account', data.accountId, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			sameSite: 'lax',
			httpOnly: true,
			secure: !dev
		});
		redirect(303, rule ? '/plan?saved=1' : '/movements/new?saved=1');
	}
};
