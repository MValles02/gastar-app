import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
import { accountOption } from './account-options';
import { getAccount, listAccounts } from './accounts-queries';
import { getCategory, listCategories } from './categories-queries';
import { type MovementData, resolveMovement } from './movements';

/** Archived accounts/category already referenced by the movement being edited (they stay valid). */
export type KeptRefs = {
	accountIds: string[];
	categoryId: string | null;
	amount?: number | null;
	archivedOk?: string[];
};

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
				...accountOption(a),
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
