import type { MovementType } from './dashboard';
import type { MovementData } from './movements';
import {
	approveImport,
	importPrefill,
	listImportRules,
	listPendingImports,
	type ImportItem
} from './import-queries';
import { pgErrorCode } from './db/errors';
import { listAccounts } from './accounts-queries';
import { listCategories } from './categories-queries';
import { resolvePostedMovement } from './movement-pickers';

/** Active accounts in the item's currency other than its own: the only valid counter accounts (no exchange rate). */
export const counterAccountsOf = <A extends { currency: string; id: string }>(
	accounts: A[],
	item: { accountId: string; currency: string }
) => accounts.filter((a) => a.currency === item.currency && a.id !== item.accountId);

/** Rules and the active accounts and categories an item's suggestion is computed from. */
export async function suggestionContext(userId: string) {
	const [rules, accounts, categories] = await Promise.all([
		listImportRules(userId),
		listAccounts(userId),
		listCategories(userId)
	]);
	return { rules, categories, accounts };
}

type SuggestionContext = Awaited<ReturnType<typeof suggestionContext>>;

/**
 * Approves one item with its suggestion: 'none' when it has none, 'stale' when it was already reviewed
 * or its movement no longer validates. `auto` records it as approved automatically. Does not catch.
 */
export async function approveSuggestion(
	userId: string,
	item: ImportItem,
	ctx: SuggestionContext,
	auto = false
): Promise<'none' | 'approved' | 'stale'> {
	const prefill = importPrefill(
		item,
		ctx.rules,
		ctx.categories,
		counterAccountsOf(ctx.accounts, item)
	);
	// Only rows that show "Aprobar" have a suggestion; the rest go through the review form.
	if (prefill.suggestion === null) return 'none';
	// The values come from the rule itself: nothing new to remember.
	const out = await approveWithValues(userId, item, prefill, false, auto);
	return 'result' in out && out.result === 'approved' ? 'approved' : 'stale';
}

/**
 * Approves every pending item that has a suggestion; failures count as skipped. An automatic run leaves
 * out items the user already undid from an auto-approval.
 */
async function approveAllSuggested(userId: string, auto: boolean) {
	const [items, ctx] = await Promise.all([listPendingImports(userId), suggestionContext(userId)]);
	let approved = 0;
	let skipped = 0;
	for (const item of items.filter((i) => !(auto && i.autoApproveBlocked))) {
		try {
			const out = await approveSuggestion(userId, item, ctx, auto);
			if (out === 'approved') approved++;
			else if (out === 'stale') skipped++;
		} catch (e) {
			console.error(
				`[imports] ${auto ? 'auto' : 'bulk'} approve failed`,
				pgErrorCode(e) ?? 'unknown'
			);
			skipped++;
		}
	}
	return { approved, skipped };
}

/** "Aprobar N sugeridos": every pending item with a suggestion, including ones undone from an auto-approval. */
export const approveSuggestedImports = (userId: string) => approveAllSuggested(userId, false);

/**
 * Approves every pending item whose prefill is a usable rule, except items the user already undid from an
 * auto-approval. Never creates or changes a rule; an item that fails validation stays pending. Only
 * ingestImportItems calls it. Returns how many were approved.
 */
export async function autoApprovePending(userId: string): Promise<number> {
	const { approved } = await approveAllSuggested(userId, true);
	return approved;
}

/**
 * Approves one pending item with already-validated values, saving its rule only when `remember` is set.
 * Does not catch: callers decide what a thrown error (e.g. a foreign key violation) means.
 */
export async function approveWithValues(
	userId: string,
	item: ImportItem,
	values: { type: MovementType; description: string; categoryId: string; counterAccountId: string },
	remember: boolean,
	auto = false
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
		remember,
		auto
	);
	return { result };
}
