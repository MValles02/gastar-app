import { formFail } from '$lib/form';
import { type Currency, formatAmountInput } from '$lib/money';
import { withBalances } from '$lib/server/accounts/balance';
import { accountOriginSums, accountTransfersIn, listAccounts } from '$lib/server/accounts/queries';
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from '$lib/server/db/errors';
import { dateLabel, localDay } from '$lib/server/month';
import { notFoundHelpers } from '$lib/server/guards';
import { UNAVAILABLE_MESSAGE } from '$lib/server/movements';
import { type KeptRefs, movementPickers } from '$lib/server/movement-pickers';
import { categoryUsage, getMovement } from '$lib/server/movements-queries';
import { activeRuleItems } from '$lib/server/plan-view';
import { listRecurring } from '$lib/server/plan-queries';
import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';

export { movementPickers, resolvePostedMovement } from '$lib/server/movement-pickers';

export const { notFound, requireId } = notFoundHelpers('Movimiento no encontrado.');

/** The user's movement, or a 404 (invalid, foreign and missing ids alike). */
export async function findMovement(userId: string, id: string) {
	requireId(id);
	const [m] = await getMovement(userId, id);
	if (!m) notFound();
	return m;
}

export const keptRefs = (m: {
	accountId: string;
	destinationAccountId: string | null;
	categoryId: string | null;
	amount: number;
	accountCurrency: Currency;
}): KeptRefs => ({
	accountIds: m.destinationAccountId ? [m.accountId, m.destinationAccountId] : [m.accountId],
	categoryId: m.categoryId,
	// Only an ARS amount is kept: a USD amount with cents must not skip the check on an ARS account.
	amount: m.accountCurrency === 'ARS' ? m.amount : null
});

type FoundMovement = Awaited<ReturnType<typeof findMovement>>;

/** The movement as form field values (what the form posts back). */
export const formValues = (m: FoundMovement) => ({
	type: m.type,
	occurredAt: localDay(m.occurredAt),
	description: m.description,
	amount: formatAmountInput(m.amount, m.accountCurrency),
	accountId: m.accountId,
	destinationAccountId: m.destinationAccountId ?? '',
	exchangeRate: m.exchangeRate !== null ? formatAmountInput(m.exchangeRate, 'ARS') : '',
	categoryId: m.categoryId ?? ''
});

/** Detail payload: display fields, ids, pickers (archived refs kept) and the form values. */
export async function detailOf(userId: string, id: string) {
	const m = await findMovement(userId, id);
	const { accounts, categories } = await movementPickers(userId, keptRefs(m));
	// Active fixed payments of the movement's type and currency; its current one stays listed even if inactive.
	const rules =
		m.type === 'transfer' ? [] : await activeRuleItems(userId, m.accountCurrency, m.type);
	if (m.recurringId && !rules.some((r) => r.id === m.recurringId)) {
		const [r] = await listRecurring(userId, undefined, m.recurringId);
		if (r)
			rules.push({
				id: r.id,
				name: r.description,
				icon: toCategoryIconKey(r.categoryIcon) ?? ('categories' as const),
				color: toSwatchKey(r.categoryColor)
			});
	}
	return {
		movement: {
			id: m.id,
			type: m.type,
			dateLabel: dateLabel(m.occurredAt),
			occurredAt: localDay(m.occurredAt),
			description: m.description,
			amount: m.amount,
			destinationAmount: m.destinationAmount,
			exchangeRate: m.exchangeRate,
			accountId: m.accountId,
			destinationAccountId: m.destinationAccountId,
			categoryId: m.categoryId,
			recurringId: m.recurringId,
			accountName: m.accountName,
			accountIcon: m.accountIcon,
			accountColor: m.accountColor,
			accountCurrency: m.accountCurrency,
			accountArchived: m.accountArchivedAt !== null,
			destinationName: m.destinationName,
			destinationIcon: m.destinationIcon,
			destinationColor: m.destinationColor,
			destinationCurrency: m.destinationCurrency,
			destinationArchived: m.destinationArchivedAt !== null,
			categoryName: m.categoryName,
			categoryColor: m.categoryColor,
			categoryIcon: m.categoryIcon,
			categoryArchived: m.categoryArchivedAt !== null
		},
		accounts,
		categories,
		rules,
		values: formValues(m)
	};
}

/**
 * `movementPickers` for the new-movement drawer: accounts carry their current balance and categories
 * come most used first (ties by name).
 */
export async function drawerPickers(userId: string) {
	const [{ accounts, categories }, rows, sums, ins, usage] = await Promise.all([
		movementPickers(userId),
		listAccounts(userId),
		accountOriginSums(userId),
		accountTransfersIn(userId),
		categoryUsage(userId)
	]);
	const balances = new Map(withBalances(rows, sums, ins).map((a) => [a.id, a.balance]));
	const uses = new Map(usage.map((u) => [u.categoryId, u.uses]));
	return {
		accounts: accounts.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 })),
		categories: categories.toSorted(
			(a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'es')
		)
	};
}

/** A write that hit an account/category deleted meanwhile fails on the form; anything else rethrows. */
export function failIfUnavailable(e: unknown, values: Record<string, string>) {
	if (pgErrorCode(e) === PG_FOREIGN_KEY_VIOLATION)
		return formFail(400, { values, errors: { accountId: UNAVAILABLE_MESSAGE } });
	throw e;
}
