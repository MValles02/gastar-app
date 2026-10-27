import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { formatDay } from '$lib/locale';
import { db } from './db';
import { financialAccounts, mpImportItems, mpImportRules, mpSyncState } from './db/schema';
import {
	canAccessAccount,
	canAccessImport,
	canAccessImportRule,
	importRuleOwnedBy
} from './access';
import type { MovementType } from './dashboard';
import type { MovementRow } from './movements';
import { createMovement } from './movements-queries';
import { localDay, TZ } from './month';
import { mpImportAccountId } from './mp-sync';

const pending = (userId: string) =>
	and(canAccessImport(userId), eq(mpImportItems.status, 'pending'));

/** The configured import account when it is the user's, else null. */
export async function getImportAccount(userId: string) {
	const id = mpImportAccountId();
	if (!id) return null;
	const [row] = await db
		.select({ id: financialAccounts.id, name: financialAccounts.name })
		.from(financialAccounts)
		.where(and(eq(financialAccounts.id, id), canAccessAccount(userId)))
		.limit(1);
	return row ?? null;
}

const itemColumns = {
	id: mpImportItems.id,
	accountId: mpImportItems.accountId,
	status: mpImportItems.status,
	kind: mpImportItems.kind,
	isCredit: mpImportItems.isCredit,
	amount: mpImportItems.amount,
	occurredAt: mpImportItems.occurredAt,
	counterpartyId: mpImportItems.counterpartyId,
	counterpartyNickname: mpImportItems.counterpartyNickname,
	merchant: mpImportItems.merchant,
	operationType: mpImportItems.operationType,
	rawDescription: mpImportItems.rawDescription
};

export function listPendingImports(userId: string) {
	return db
		.select(itemColumns)
		.from(mpImportItems)
		.where(pending(userId))
		.orderBy(desc(mpImportItems.occurredAt), desc(mpImportItems.createdAt));
}

export async function pendingImportCount(userId: string): Promise<number> {
	const [row] = await db.select({ n: count() }).from(mpImportItems).where(pending(userId));
	return row.n;
}

export async function getSyncState(userId: string, accountId: string) {
	const [row] = await db
		.select({
			syncedUntil: mpSyncState.syncedUntil,
			runningSince: mpSyncState.runningSince,
			lastRunAt: mpSyncState.lastRunAt,
			lastError: mpSyncState.lastError,
			phase: mpSyncState.phase,
			newItems: mpSyncState.newItems
		})
		.from(mpSyncState)
		.innerJoin(financialAccounts, eq(mpSyncState.accountId, financialAccounts.id))
		.where(and(eq(mpSyncState.accountId, accountId), canAccessAccount(userId)))
		.limit(1);
	return row ?? null;
}

/** Dev reset: the user's items and rules, plus the sync state of `accountId` if it is theirs. */
export function deleteImportData(userId: string, accountId: string) {
	return db.transaction(async (tx) => {
		await tx.delete(mpImportItems).where(canAccessImport(userId));
		await tx.delete(mpImportRules).where(canAccessImportRule(userId));
		await tx.delete(mpSyncState).where(
			and(
				eq(mpSyncState.accountId, accountId),
				inArray(
					mpSyncState.accountId,
					tx
						.select({ id: financialAccounts.id })
						.from(financialAccounts)
						.where(and(eq(financialAccounts.id, accountId), canAccessAccount(userId)))
				)
			)
		);
	});
}

const FALLBACK_TITLE: Record<string, string> = {
	yield: 'Rendimientos',
	payout: 'Transferencia o retiro',
	merchant_payout: 'Pago en comercio',
	account_fund: 'Ingreso de dinero'
};

type TitleFields = {
	counterpartyNickname: string | null;
	merchant: string | null;
	kind: string;
	isCredit: boolean;
	rawDescription: string;
};

/** The list title of an item, also the default description of its movement. */
export function importTitle(i: TitleFields): string {
	// MP text comes padded sometimes; a blank value counts as absent.
	const clean = (s: string | null | undefined) => s?.trim() || null;
	if (i.kind === 'refund') {
		const of = clean(i.counterpartyNickname) ?? clean(i.merchant);
		return of ? `Devolución · ${of}` : 'Devolución';
	}
	return (
		clean(i.counterpartyNickname) ??
		clean(i.merchant) ??
		(i.kind === 'payment'
			? i.isCredit
				? 'Transferencia recibida'
				: 'Pago'
			: (FALLBACK_TITLE[i.kind] ?? i.rawDescription.trim()))
	);
}

/** dd/mm/aaaa hh:mm, 24 h, Buenos Aires. */
export function importDateTime(d: Date): string {
	const time = new Intl.DateTimeFormat('es-AR', {
		timeZone: TZ,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).format(d);
	return `${formatDay(localDay(d))} ${time}`;
}

/** A credit becomes an income or a transfer in; a debit an outcome or a transfer out. */
export const importTypes = (isCredit: boolean): MovementType[] =>
	isCredit ? ['income', 'transfer'] : ['outcome', 'transfer'];

type ImportRuleKey = { matchKind: 'counterparty' | 'merchant' | 'kind'; matchValue: string };
type ImportKeyFields = {
	kind: string;
	operationType: string | null;
	counterpartyId: string | null;
	merchant: string | null;
};

/** The rule keys an item can match, strongest first. */
export function importRuleKeys(i: ImportKeyFields): ImportRuleKey[] {
	const keys: ImportRuleKey[] = [];
	// A refund reverses its payment: learning from it would overwrite the payment's rule.
	if (i.kind === 'refund') return keys;
	if (i.operationType === 'money_transfer' && i.counterpartyId)
		keys.push({ matchKind: 'counterparty', matchValue: i.counterpartyId });
	const merchant = i.merchant?.trim().toLowerCase();
	if (merchant) keys.push({ matchKind: 'merchant', matchValue: merchant });
	if (['yield', 'payout', 'merchant_payout', 'account_fund'].includes(i.kind))
		keys.push({ matchKind: 'kind', matchValue: i.kind });
	return keys;
}

/** Payouts of either kind vary too much for one rule over the whole kind to be worth remembering. */
const UNSTABLE_KINDS = ['payout', 'merchant_payout'];

/**
 * The key an approval may remember and who it names ("Recordar para …"), or null when the item has no
 * stable key. Existing rules on other keys still prefill (importRuleKeys); this only gates new ones.
 */
export function rememberKey(
	i: ImportKeyFields & TitleFields
): { key: ImportRuleKey; label: string } | null {
	const key = importRuleKeys(i)[0];
	if (!key || (key.matchKind === 'kind' && UNSTABLE_KINDS.includes(key.matchValue))) return null;
	const label =
		key.matchKind === 'counterparty'
			? i.counterpartyNickname?.trim() || null
			: key.matchKind === 'merchant'
				? i.merchant!.trim()
				: FALLBACK_TITLE[key.matchValue];
	return { key, label: label || importTitle(i) };
}

/** The user's item in any status, or undefined (foreign and missing ids alike). */
export async function getImport(userId: string, id: string) {
	const [row] = await db
		.select(itemColumns)
		.from(mpImportItems)
		.where(and(eq(mpImportItems.id, id), canAccessImport(userId)))
		.limit(1);
	return row;
}

export type ImportItem = NonNullable<Awaited<ReturnType<typeof getImport>>>;

export function listImportRules(userId: string) {
	return db
		.select({
			matchKind: mpImportRules.matchKind,
			matchValue: mpImportRules.matchValue,
			type: mpImportRules.type,
			categoryId: mpImportRules.categoryId,
			counterAccountId: mpImportRules.counterAccountId,
			description: mpImportRules.description
		})
		.from(mpImportRules)
		.where(canAccessImportRule(userId));
}

type ImportRule = Awaited<ReturnType<typeof listImportRules>>[number];

export type ImportPrefill = {
	type: MovementType;
	categoryId: string;
	counterAccountId: string;
	description: string;
	/** Name of the rule's category or counter account; null without a usable rule. */
	suggestion: string | null;
	/** The type is a guess (kind "other"): the page asks for a review. */
	review: boolean;
};

/**
 * Read-time prefill of a pending item: the first matching rule (strongest key) wins when its target is
 * still active and its type fits the direction; otherwise defaults. Never falls through to a weaker rule.
 * `categories` and `accounts` are the active, owned, pickable ones.
 */
export function importPrefill(
	item: ImportKeyFields & TitleFields,
	rules: ImportRule[],
	categories: { id: string; name: string; kind: string | null }[],
	accounts: { id: string; name: string }[]
): ImportPrefill {
	const title = importTitle(item);
	const rule = importRuleKeys(item)
		.map((k) => rules.find((r) => r.matchKind === k.matchKind && r.matchValue === k.matchValue))
		.find((r) => r !== undefined);
	if (rule && importTypes(item.isCredit).includes(rule.type)) {
		const target =
			rule.type === 'transfer'
				? accounts.find((a) => a.id === rule.counterAccountId)
				: categories.find(
						(c) => c.id === rule.categoryId && (c.kind === null || c.kind === rule.type)
					);
		if (target)
			return {
				type: rule.type,
				categoryId: rule.type === 'transfer' ? '' : target.id,
				counterAccountId: rule.type === 'transfer' ? target.id : '',
				description: rule.description ?? title,
				suggestion: target.name,
				review: false
			};
	}
	const type: MovementType =
		item.kind === 'payout' || item.kind === 'account_fund'
			? 'transfer'
			: item.isCredit
				? 'income'
				: 'outcome';
	return {
		type,
		categoryId: '',
		counterAccountId: '',
		description: title,
		suggestion: null,
		review: item.kind === 'other'
	};
}

export type ApproveRule = {
	type: MovementType;
	categoryId: string | null;
	counterAccountId: string | null;
	description: string;
};

/**
 * One transaction: claim the pending item, insert the movement, link it and, when `remember` is set,
 * learn the rule (no rule is created or changed otherwise).
 * 'stale' (nothing written) when the item is no longer pending.
 */
export function approveImport(
	userId: string,
	item: ImportItem,
	row: MovementRow,
	rule: ApproveRule,
	remember: boolean
): Promise<'approved' | 'stale'> {
	return db.transaction(async (tx) => {
		const [claimed] = await tx
			.update(mpImportItems)
			.set({ status: 'approved' })
			.where(and(eq(mpImportItems.id, item.id), pending(userId)))
			.returning({ id: mpImportItems.id });
		if (!claimed) return 'stale';

		const [movement] = await createMovement(userId, row, tx);
		await tx
			.update(mpImportItems)
			.set({ movementId: movement.id })
			.where(and(eq(mpImportItems.id, item.id), canAccessImport(userId)));

		const key = remember ? rememberKey(item)?.key : undefined;
		if (key) {
			const { type, categoryId, counterAccountId, description } = rule;
			await tx
				.insert(mpImportRules)
				.values({
					...importRuleOwnedBy(userId),
					...key,
					type,
					categoryId,
					counterAccountId,
					description
				})
				.onConflictDoUpdate({
					target: [mpImportRules.userId, mpImportRules.matchKind, mpImportRules.matchValue],
					set: { type, categoryId, counterAccountId, description, updatedAt: new Date() }
				});
		}
		return 'approved';
	});
}

/** Marks the pending item rejected (the row stays so the sync never re-imports it); 'stale' if it was not pending. */
export async function rejectImport(userId: string, id: string): Promise<'rejected' | 'stale'> {
	const rows = await db
		.update(mpImportItems)
		.set({ status: 'rejected' })
		.where(and(eq(mpImportItems.id, id), pending(userId)))
		.returning({ id: mpImportItems.id });
	return rows.length > 0 ? 'rejected' : 'stale';
}
