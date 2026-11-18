import { categoryLook } from '#lib/appearance.ts';
import type { Currency } from '#lib/money.ts';
import type { MovementType } from '#lib/movement.ts';
import { accountOption, getAccount, listAccounts } from '../accounts/queries';
import { getCategory, listCategories } from '../categories/queries';
import { type KeptRefs, type MovementData, resolveMovement } from './form';

type Row = { id: string; name: string; icon: string | null; color: string | null };

export const accountItem = (a: Row & { currency: Currency; archivedAt: Date | null }) => ({
	...accountOption(a),
	meta: a.currency,
	currency: a.currency,
	archived: a.archivedAt !== null
});

/** A category as a picker item (unknown icon → the generic glyph). */
export const categoryItem = (c: Row & { kind: MovementType | null; archivedAt: Date | null }) => ({
	id: c.id,
	name: c.name,
	...categoryLook(c),
	kind: c.kind,
	archived: c.archivedAt !== null
});

export async function movementPickers(userId: string, keep?: KeptRefs) {
	const opts = { archived: keep !== undefined };
	const [accountRows, categoryRows] = await Promise.all([
		listAccounts(userId, opts),
		listCategories(userId, opts)
	]);
	return {
		accounts: accountRows
			.filter((a) => !a.archivedAt || keep?.accountIds.includes(a.id))
			.map(accountItem),
		categories: categoryRows
			.filter((c) => !c.archivedAt || c.id === keep?.categoryId)
			.map(categoryItem)
	};
}

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
