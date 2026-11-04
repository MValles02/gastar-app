import { fail } from '@sveltejs/kit';
import { type Currency, formatAmountInput } from '$lib/money';
import { toCategoryIconKey, toIconKey, toSwatchKey } from '$lib/appearance';
import { withBalances } from '$lib/server/accounts';
import {
	accountOriginSums,
	accountTransfersIn,
	getAccount,
	listAccounts
} from '$lib/server/accounts-queries';
import { getCategory, listCategories } from '$lib/server/categories-queries';
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from '$lib/server/db/errors';
import { dateLabel, localDay } from '$lib/server/month';
import { notFoundHelpers } from '$lib/server/not-found';
import { type MovementData, resolveMovement, UNAVAILABLE_MESSAGE } from '$lib/server/movements';
import { categoryUsage, getMovement } from '$lib/server/movements-queries';

/** Archived accounts/category already referenced by the movement being edited (they stay valid). */
type KeptRefs = { accountIds: string[]; categoryId: string | null; amount?: number | null };

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
		values: formValues(m)
	};
}

/** Picker items: active accounts and categories, plus the archived ones in `keep` (edit). */
export async function movementPickers(userId: string, keep?: KeptRefs) {
	const opts = { archived: keep !== undefined };
	const [accountRows, categoryRows] = await Promise.all([
		listAccounts(userId, opts),
		listCategories(userId, opts)
	]);
	return {
		accounts: accountRows
			.filter((a) => !a.archivedAt || keep?.accountIds.includes(a.id))
			.map((a) => ({
				id: a.id,
				name: a.name,
				icon: toIconKey(a.icon),
				color: toSwatchKey(a.color),
				meta: a.currency,
				currency: a.currency,
				archived: a.archivedAt !== null
			})),
		categories: categoryRows
			.filter((c) => !c.archivedAt || c.id === keep?.categoryId)
			.map((c) => ({
				id: c.id,
				name: c.name,
				icon: toCategoryIconKey(c.icon) ?? ('categories' as const),
				color: toSwatchKey(c.color),
				kind: c.kind,
				archived: c.archivedAt !== null
			}))
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

/** Looks up the posted account(s) and category (owner-checked) and resolves the row to save. */
export async function resolvePostedMovement(userId: string, data: MovementData, keep?: KeptRefs) {
	const [[origin], [destination], [category]] = await Promise.all([
		getAccount(userId, data.accountId),
		data.type === 'transfer' && data.destinationAccountId
			? getAccount(userId, data.destinationAccountId)
			: Promise.resolve([]),
		data.type !== 'transfer' && data.categoryId
			? getCategory(userId, data.categoryId)
			: Promise.resolve([])
	]);
	return { origin, resolved: resolveMovement(data, { origin, destination, category }, keep) };
}

/** A write that hit an account/category deleted meanwhile fails on the form; anything else rethrows. */
export function failIfUnavailable(e: unknown, values: Record<string, string>) {
	if (pgErrorCode(e) === PG_FOREIGN_KEY_VIOLATION)
		return fail(400, { values, errors: { accountId: UNAVAILABLE_MESSAGE } });
	throw e;
}
