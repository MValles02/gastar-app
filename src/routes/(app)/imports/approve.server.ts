import type { MovementType } from '$lib/server/dashboard';
import type { MovementData } from '$lib/server/movements';
import { approveImport, type ImportItem } from '$lib/server/mp-import-queries';
import { resolvePostedMovement } from '../movements/form.server';

/**
 * Approves one pending item with already-validated values, saving its rule only when `remember` is set.
 * Does not catch: callers decide what a thrown error (e.g. a foreign key violation) means.
 */
export async function approveWithValues(
	userId: string,
	item: ImportItem,
	values: { type: MovementType; description: string; categoryId: string; counterAccountId: string },
	remember: boolean
) {
	const isTransfer = values.type === 'transfer';
	const outgoing = !item.isCredit;
	const data: MovementData = {
		type: values.type,
		occurredAt: item.occurredAt,
		description: values.description,
		amount: item.amount,
		accountId: isTransfer && !outgoing ? values.counterAccountId : item.accountId,
		destinationAccountId: isTransfer ? (outgoing ? values.counterAccountId : item.accountId) : null,
		categoryId: isTransfer ? null : values.categoryId,
		exchangeRate: null
	};
	// The imported amount keeps its exact cents (keep.amount).
	const { resolved } = await resolvePostedMovement(userId, data, {
		accountIds: [],
		categoryId: null,
		amount: item.amount
	});
	if (!resolved.ok) return { errors: resolved.errors };

	const result = await approveImport(
		userId,
		item,
		resolved.row,
		{
			type: data.type,
			categoryId: data.categoryId,
			counterAccountId: isTransfer ? values.counterAccountId : null,
			description: values.description
		},
		remember
	);
	return { result };
}
