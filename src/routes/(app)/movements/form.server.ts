import { error, fail } from '@sveltejs/kit';
import { toIconKey, toSwatchKey } from '$lib/appearance';
import { getAccount, listAccounts } from '$lib/server/accounts-queries';
import { getCategory, listCategories } from '$lib/server/categories-queries';
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from '$lib/server/db/errors';
import { isUuid } from '$lib/server/db/util';
import { type MovementData, resolveMovement, UNAVAILABLE_MESSAGE } from '$lib/server/movements';
import { getMovement } from '$lib/server/movements-queries';

/** Archived accounts/category already referenced by the movement being edited (they stay valid). */
type KeptRefs = { accountIds: string[]; categoryId: string | null };

export const notFound = () => error(404, 'Movimiento no encontrado.');

/** The user's movement, or a 404 (invalid, foreign and missing ids alike). */
export async function findMovement(userId: string, id: string) {
	if (!isUuid(id)) notFound();
	const [m] = await getMovement(userId, id);
	if (!m) notFound();
	return m;
}

export const keptRefs = (m: {
	accountId: string;
	destinationAccountId: string | null;
	categoryId: string | null;
}): KeptRefs => ({
	accountIds: m.destinationAccountId ? [m.accountId, m.destinationAccountId] : [m.accountId],
	categoryId: m.categoryId
});

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
				icon: 'categories' as const,
				color: toSwatchKey(c.color),
				archived: c.archivedAt !== null
			}))
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
