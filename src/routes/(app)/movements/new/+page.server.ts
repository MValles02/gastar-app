import { fail, redirect } from '@sveltejs/kit';
import { PREFERENCE_COOKIE_OPTIONS } from '$lib/server/cookies';
import type { Actions, PageServerLoad } from './$types';
import { isUuid } from '$lib/server/db/util';
import { formatAmountInput } from '$lib/money';
import { localDay } from '$lib/server/month';
import { parseMovementForm } from '$lib/server/movements';
import { createMovement } from '$lib/server/movements-queries';
import { isRecurringActive } from '$lib/server/plan';
import { createMovementWithRule, listRecurring } from '$lib/server/plan-queries';
import { failIfUnavailable, movementPickers, resolvePostedMovement } from '../form.server';

/** Remembers the account of the last saved movement as the next form's default. */
const LAST_ACCOUNT_COOKIE = 'last_account';

/** An active recurring rule owned by the user, or undefined (inactive, foreign and invalid ids alike). */
async function findRule(userId: string, id: FormDataEntryValue | null) {
	if (typeof id !== 'string' || !isUuid(id)) return undefined;
	const [rule] = await listRecurring(userId, undefined, id);
	return rule && isRecurringActive(rule) ? rule : undefined;
}

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = locals.user!.id;
	const { accounts, categories } = await movementPickers(userId);
	const rule = await findRule(userId, url.searchParams.get('recurring'));
	const last = cookies.get(LAST_ACCOUNT_COOKIE);
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
		const rule = await findRule(userId, fd.get('recurringId'));
		// A payment always takes the rule's category, whatever was posted.
		if (rule) fd.set('categoryId', rule.categoryId);
		const parsed = parseMovementForm(fd);
		const { values } = parsed;
		// Keeps the checkbox state when the form is shown again with errors.
		if (fd.get('repeat') === 'on') values.repeat = 'on';
		if (!parsed.ok) return fail(400, { values, errors: parsed.errors });
		const { data } = parsed;

		const { origin, resolved } = await resolvePostedMovement(userId, data);
		if (!resolved.ok) return fail(400, { values, errors: resolved.errors });

		if (rule) {
			if (data.type !== rule.type)
				return fail(400, {
					values,
					errors: {
						type: `Este pago es un ${rule.type === 'income' ? 'ingreso' : 'gasto'}.`
					}
				});
			if (origin!.currency !== rule.currency)
				return fail(400, {
					values,
					errors: {
						accountId: `Elegí una cuenta en ${rule.currency} para registrar este pago.`
					}
				});
		}

		try {
			const { type, categoryId } = resolved.row;
			if (!rule && fd.get('repeat') === 'on' && type !== 'transfer' && categoryId) {
				// The rule repeats on the movement's Buenos Aires day (clamped by recurringStatus in short months).
				await createMovementWithRule(userId, resolved.row, {
					type,
					description: resolved.row.description,
					amount: resolved.row.amount,
					accountId: resolved.row.accountId,
					categoryId,
					dayOfMonth: Number(localDay(resolved.row.occurredAt).slice(8, 10))
				});
			} else {
				await createMovement(userId, { ...resolved.row, recurringId: rule?.id ?? null });
			}
		} catch (e) {
			return failIfUnavailable(e, values);
		}
		cookies.set(LAST_ACCOUNT_COOKIE, data.accountId, PREFERENCE_COOKIE_OPTIONS);
		redirect(303, rule ? '/plan?saved=1' : '/movements/new?saved=1');
	}
};
