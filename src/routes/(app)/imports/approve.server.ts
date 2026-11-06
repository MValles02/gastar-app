import type { MovementType } from '$lib/server/dashboard';
import type { MovementData } from '$lib/server/movements';
import {
	approveImport,
	importPrefill,
	listImportRules,
	listPendingImports,
	type ImportItem
} from '$lib/server/mp-import-queries';
import { pgErrorCode } from '$lib/server/db/errors';
import { movementPickers, resolvePostedMovement } from '../movements/form.server';

/** Active ARS accounts other than the import account: the only valid counter accounts. */
const counterAccountsOf = <A extends { currency: string; id: string }>(
	accounts: A[],
	importAccountId: string
) => accounts.filter((a) => a.currency === 'ARS' && a.id !== importAccountId);

/** Rules and pickers needed to compute an item's suggestion. */
export async function suggestionContext(userId: string, importAccountId: string) {
	const [rules, pickers] = await Promise.all([listImportRules(userId), movementPickers(userId)]);
	return {
		rules,
		categories: pickers.categories,
		counterAccounts: counterAccountsOf(pickers.accounts, importAccountId)
	};
}

type SuggestionContext = Awaited<ReturnType<typeof suggestionContext>>;

/** Approves one item with its suggestion: 'none' when it has none, 'stale' when it was already reviewed. Does not catch. */
export async function approveSuggestion(
	userId: string,
	item: ImportItem,
	ctx: SuggestionContext
): Promise<'none' | 'approved' | 'stale'> {
	const prefill = importPrefill(item, ctx.rules, ctx.categories, ctx.counterAccounts);
	// Only rows that show "Aprobar" have a suggestion; the rest go through the review form.
	if (prefill.suggestion === null) return 'none';
	// The values come from the rule itself: nothing new to remember.
	const out = await approveWithValues(userId, item, prefill, false);
	return 'result' in out && out.result === 'approved' ? 'approved' : 'stale';
}

/** Approves every pending item that has a suggestion; failures count as skipped. */
export async function approveSuggestedImports(userId: string, importAccountId: string) {
	const [items, ctx] = await Promise.all([
		listPendingImports(userId),
		suggestionContext(userId, importAccountId)
	]);
	let approved = 0;
	let skipped = 0;
	for (const item of items) {
		try {
			const out = await approveSuggestion(userId, item, ctx);
			if (out === 'approved') approved++;
			else if (out === 'stale') skipped++;
		} catch (e) {
			console.error('[imports] bulk approve failed', pgErrorCode(e) ?? 'unknown');
			skipped++;
		}
	}
	return { approved, skipped };
}

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
