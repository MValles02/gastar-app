import { and, count, desc, eq, gt, inArray, isNotNull, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db';
import {
	cardAlerts,
	categories,
	financialAccounts,
	importSettings,
	movements,
	importItems,
	importRules,
	mpSyncState,
	recurringMovements
} from '../db/schema';
import { dayOfMonth } from '#lib/dates.ts';
import { localDay } from '../month';
import { ownRule } from '../recurring/queries';
import { alertKeySql } from './keys';
import { canAccessAccount, canAccessMovement, canAccessOwn, userOwned } from '../access';
import type { MovementType } from '#lib/movement.ts';
import type { MovementRow } from '../movements/form';
import { createMovement, deleteMovement } from '../movements/queries';
import { installmentAmounts, installmentEndsMonth, rememberKey } from './rules';
import { AUTO_APPROVED_DAYS } from './settings';
import type { Kind, SourceId } from './sources';

// The columns are CHECK-constrained to the SOURCE ids and KIND values: the one cast from text.
const itemSource = sql<SourceId>`${importItems.source}`;
const itemKind = sql<Kind>`${importItems.kind}`;

const pending = (userId: string) =>
	and(canAccessOwn(userId, importItems), eq(importItems.status, 'pending'));

const itemColumns = {
	id: importItems.id,
	accountId: importItems.accountId,
	// The item's account currency: amounts are in it, and transfers stay within it.
	currency: financialAccounts.currency,
	source: itemSource,
	installment: importItems.installment,
	installments: importItems.installments,
	recurringId: importItems.recurringId,
	// The card alert's total of an installment purchase (by key: the alert's link is set after the item exists).
	installmentTotal: sql<
		number | null
	>`(select ${cardAlerts.amount} from ${cardAlerts} where ${cardAlerts.userId} = ${importItems.userId} and ${alertKeySql(cardAlerts.gmailMessageId)} in (${importItems.externalKey}, ${importItems.aliasKey}) limit 1)`.mapWith(
		(v) => (v === null ? null : Number(v))
	),
	status: importItems.status,
	kind: itemKind,
	isCredit: importItems.isCredit,
	amount: importItems.amount,
	occurredAt: importItems.occurredAt,
	counterpartyId: importItems.counterpartyId,
	counterpartyNickname: importItems.counterpartyNickname,
	merchant: importItems.merchant,
	operationType: importItems.operationType,
	rawDescription: importItems.rawDescription,
	autoApproveBlocked: importItems.autoApproveBlocked
};

export function listPendingImports(userId: string) {
	return db
		.select(itemColumns)
		.from(importItems)
		.innerJoin(financialAccounts, eq(financialAccounts.id, importItems.accountId))
		.where(and(pending(userId), canAccessAccount(userId)))
		.orderBy(desc(importItems.occurredAt), desc(importItems.createdAt));
}

export async function pendingImportCount(userId: string): Promise<number> {
	const [row] = await db.select({ n: count() }).from(importItems).where(pending(userId));
	return row.n;
}

/** Dev reset: the user's items and rules, plus the sync state of every account they own. */
export function deleteImportData(userId: string) {
	return db.transaction(async (tx) => {
		await tx.delete(importItems).where(canAccessOwn(userId, importItems));
		await tx.delete(importRules).where(canAccessOwn(userId, importRules));
		await tx.delete(importSettings).where(canAccessOwn(userId, importSettings));
		await tx
			.delete(mpSyncState)
			.where(
				inArray(
					mpSyncState.accountId,
					tx
						.select({ id: financialAccounts.id })
						.from(financialAccounts)
						.where(canAccessAccount(userId))
				)
			);
	});
}

/** The user's item in any status, or undefined (foreign and missing ids alike). */
export async function getImport(userId: string, id: string) {
	const [row] = await db
		.select(itemColumns)
		.from(importItems)
		.innerJoin(financialAccounts, eq(financialAccounts.id, importItems.accountId))
		.where(and(eq(importItems.id, id), canAccessOwn(userId, importItems), canAccessAccount(userId)))
		.limit(1);
	return row;
}

export type ImportItem = NonNullable<Awaited<ReturnType<typeof getImport>>>;

export function listImportRules(userId: string) {
	return db
		.select({
			matchKind: importRules.matchKind,
			matchValue: importRules.matchValue,
			type: importRules.type,
			categoryId: importRules.categoryId,
			counterAccountId: importRules.counterAccountId,
			description: importRules.description,
			recurringId: importRules.recurringId
		})
		.from(importRules)
		.where(canAccessOwn(userId, importRules));
}

export type ImportRule = Awaited<ReturnType<typeof listImportRules>>[number];

type ApproveRule = {
	type: MovementType;
	categoryId: string | null;
	counterAccountId: string | null;
	description: string;
	/** Fixed payment to link the movement to (and to remember); null for none. */
	recurringId: string | null;
};

/**
 * One transaction: claim the pending item, insert the movement, link it and, when `remember` is set,
 * learn the rule (no rule is created or changed otherwise). An installment item also creates its fixed
 * payment (amount = total / cuotas, ending after the last cuota) and links the movement to it. `auto` stamps it as an automatic approval.
 * 'stale' (nothing written) when the item is no longer pending.
 */
export function approveImport(
	userId: string,
	item: ImportItem,
	row: MovementRow,
	rule: ApproveRule,
	remember: boolean,
	auto = false
): Promise<'approved' | 'stale'> {
	return db.transaction(async (tx) => {
		// Its card alert is gone: nothing to size the fixed payment from, so nothing is booked.
		if (item.installments && !item.installmentTotal) throw new Error('installment alert missing');
		const [claimed] = await tx
			.update(importItems)
			.set({ status: 'approved', autoApprovedAt: auto ? sql`now()` : null })
			.where(and(eq(importItems.id, item.id), pending(userId)))
			.returning({ id: importItems.id });
		if (!claimed) return 'stale';

		let ruleId = rule.recurringId;
		if (item.installments && item.installmentTotal && rule.categoryId) {
			const day = localDay(item.occurredAt);
			const [created] = await tx
				.insert(recurringMovements)
				.values({
					...userOwned(userId),
					type: 'outcome',
					description: rule.description,
					amount: installmentAmounts(item.installmentTotal, item.installments, item.currency).rule,
					accountId: item.accountId,
					categoryId: rule.categoryId,
					dayOfMonth: dayOfMonth(day),
					endsMonth: installmentEndsMonth(day, item.installments)
				})
				.returning({ id: recurringMovements.id });
			ruleId = created.id;
		}
		const [movement] = await createMovement(userId, row, { tx, ruleId });
		await tx
			.update(importItems)
			.set({ movementId: movement.id, ...(item.installments ? { recurringId: ruleId } : {}) })
			.where(and(eq(importItems.id, item.id), canAccessOwn(userId, importItems)));

		const key = remember ? rememberKey(item)?.key : undefined;
		if (key) {
			const { type, categoryId, counterAccountId, description } = rule;
			const recurringId = item.installments ? null : rule.recurringId;
			await tx
				.insert(importRules)
				.values({
					...userOwned(userId),
					...key,
					type,
					categoryId,
					counterAccountId,
					description,
					recurringId
				})
				.onConflictDoUpdate({
					target: [importRules.userId, importRules.matchKind, importRules.matchValue],
					set: {
						type,
						categoryId,
						counterAccountId,
						description,
						recurringId,
						updatedAt: new Date()
					}
				});
		}
		return 'approved';
	});
}

/** Marks the pending item rejected (the row stays so the sync never re-imports it); 'stale' if it was not pending. */
export async function rejectImport(userId: string, id: string): Promise<'rejected' | 'stale'> {
	const rows = await db
		.update(importItems)
		.set({ status: 'rejected' })
		.where(and(eq(importItems.id, id), pending(userId)))
		.returning({ id: importItems.id });
	return rows.length > 0 ? 'rejected' : 'stale';
}

/**
 * Undo of an approval, in one transaction: deletes the movement the approval created (and the fixed
 * payment an installment approval created) and puts the item back to pending. 'changed' when the movement was edited meanwhile, 'stale' when the item is not an
 * approved one with a movement (still pending, rejected, or its movement was deleted); nothing is
 * written in either case. Rules are untouched: a quick approval never learns one. Undoing an automatic
 * approval also blocks the item from being auto-approved again (it stays for manual review).
 */
export function undoApproval(userId: string, id: string): Promise<'undone' | 'changed' | 'stale'> {
	return db.transaction(async (tx) => {
		const [item] = await tx
			.select({
				movementId: importItems.movementId,
				installments: importItems.installments,
				recurringId: importItems.recurringId
			})
			.from(importItems)
			.where(
				and(
					eq(importItems.id, id),
					canAccessOwn(userId, importItems),
					eq(importItems.status, 'approved')
				)
			)
			.for('update')
			.limit(1);
		if (!item?.movementId) return 'stale';

		const [movement] = await tx
			.select({ createdAt: movements.createdAt, updatedAt: movements.updatedAt })
			.from(movements)
			.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
			.where(and(eq(movements.id, item.movementId), canAccessMovement(userId)))
			.for('update', { of: movements })
			.limit(1);
		if (!movement) return 'stale';
		// An edit stamps updated_at; a fresh movement has both columns from the same insert.
		if (movement.updatedAt.getTime() !== movement.createdAt.getTime()) return 'changed';

		// Later cuotas still linked to the installment rule: undoing the first would orphan them.
		if (item.installments && item.recurringId) {
			const [other] = await tx
				.select({ id: movements.id })
				.from(movements)
				.where(
					and(
						eq(movements.recurringId, item.recurringId),
						ne(movements.id, item.movementId),
						canAccessOwn(userId, movements)
					)
				)
				.limit(1);
			if (other) return 'changed';
		}

		await deleteMovement(userId, item.movementId, tx);
		if (item.installments && item.recurringId)
			await tx.delete(recurringMovements).where(ownRule(userId, item.recurringId));
		await tx
			.update(importItems)
			.set({
				status: 'pending',
				movementId: null,
				autoApprovedAt: null,
				autoApproveBlocked: sql`${importItems.autoApproveBlocked} or ${importItems.autoApprovedAt} is not null`
			})
			.where(and(eq(importItems.id, id), canAccessOwn(userId, importItems)));
		return 'undone';
	});
}

const counter = alias(financialAccounts, 'counter');
const itemAccount = alias(financialAccounts, 'item_account');

/**
 * Items approved automatically in the last 30 days whose movement still exists, newest first, with the
 * category (income/outcome) or counter account (transfer) of that movement.
 */
export function listAutoApproved(userId: string) {
	return db
		.select({
			id: importItems.id,
			source: itemSource,
			kind: itemKind,
			isCredit: importItems.isCredit,
			amount: importItems.amount,
			occurredAt: importItems.occurredAt,
			counterpartyNickname: importItems.counterpartyNickname,
			merchant: importItems.merchant,
			rawDescription: importItems.rawDescription,
			installment: importItems.installment,
			currency: itemAccount.currency,
			autoApprovedAt: importItems.autoApprovedAt,
			category: categories.name,
			counterAccount: counter.name
		})
		.from(importItems)
		.innerJoin(movements, eq(movements.id, importItems.movementId))
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(itemAccount, eq(itemAccount.id, importItems.accountId))
		.leftJoin(categories, eq(categories.id, movements.categoryId))
		.leftJoin(
			counter,
			eq(
				counter.id,
				sql`case when ${movements.accountId} = ${importItems.accountId} then ${movements.destinationAccountId} else ${movements.accountId} end`
			)
		)
		.where(
			and(
				canAccessOwn(userId, importItems),
				canAccessMovement(userId),
				canAccessAccount(userId, itemAccount),
				eq(importItems.status, 'approved'),
				isNotNull(importItems.autoApprovedAt),
				gt(
					importItems.autoApprovedAt,
					sql`now() - interval '${sql.raw(String(AUTO_APPROVED_DAYS))} days'`
				)
			)
		)
		.orderBy(desc(importItems.autoApprovedAt), desc(importItems.occurredAt));
}
