import { and, count, desc, eq, gt, inArray, isNotNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { formatDay, LOCALE } from '$lib/locale';
import { db } from './db';
import {
	categories,
	financialAccounts,
	movements,
	mpImportItems,
	mpImportRules,
	mpSyncState
} from './db/schema';
import {
	canAccessAccount,
	canAccessImport,
	canAccessImportRule,
	canAccessMovement,
	importRuleOwnedBy
} from './access';
import type { MovementType } from './dashboard';
import type { MovementRow } from './movements';
import { createMovement, deleteMovement } from './movements-queries';
import { localDay, TZ } from './month';

const pending = (userId: string) =>
	and(canAccessImport(userId), eq(mpImportItems.status, 'pending'));

/** How the inbox names each source, where more than one is pending. */
export const SOURCE_LABEL: Record<string, string> = {
	mercado_pago: 'Mercado Pago',
	galicia_visa: 'Galicia Visa',
	galicia_mastercard: 'Galicia Mastercard'
};

const itemColumns = {
	id: mpImportItems.id,
	accountId: mpImportItems.accountId,
	// The item's account currency: amounts are in it, and transfers stay within it.
	currency: financialAccounts.currency,
	source: mpImportItems.source,
	installment: mpImportItems.installment,
	status: mpImportItems.status,
	kind: mpImportItems.kind,
	isCredit: mpImportItems.isCredit,
	amount: mpImportItems.amount,
	occurredAt: mpImportItems.occurredAt,
	counterpartyId: mpImportItems.counterpartyId,
	counterpartyNickname: mpImportItems.counterpartyNickname,
	merchant: mpImportItems.merchant,
	operationType: mpImportItems.operationType,
	rawDescription: mpImportItems.rawDescription,
	autoApproveBlocked: mpImportItems.autoApproveBlocked
};

export function listPendingImports(userId: string) {
	return db
		.select(itemColumns)
		.from(mpImportItems)
		.innerJoin(financialAccounts, eq(financialAccounts.id, mpImportItems.accountId))
		.where(and(pending(userId), canAccessAccount(userId)))
		.orderBy(desc(mpImportItems.occurredAt), desc(mpImportItems.createdAt));
}

export async function pendingImportCount(userId: string): Promise<number> {
	const [row] = await db.select({ n: count() }).from(mpImportItems).where(pending(userId));
	return row.n;
}

/** Dev reset: the user's items and rules, plus the sync state of every account they own. */
export function deleteImportData(userId: string) {
	return db.transaction(async (tx) => {
		await tx.delete(mpImportItems).where(canAccessImport(userId));
		await tx.delete(mpImportRules).where(canAccessImportRule(userId));
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

const FALLBACK_TITLE: Record<string, string> = {
	yield: 'Rendimientos',
	payout: 'Transferencia o retiro',
	merchant_payout: 'Pago en comercio',
	account_fund: 'Ingreso de dinero',
	card_taxes: 'Impuestos y percepciones'
};

const CARD_KINDS = ['card_purchase', 'card_installment', 'card_taxes'];

const isCardLine = (kind: string) => kind === 'card_purchase' || kind === 'card_installment';

/**
 * The stable name of a card statement reference, in its original casing ('' when nothing is left).
 * Drops: leading Visa markers (*, K, E); an embedded "USD 1.234,56" amount; NN/NN installment tokens;
 * a leading "MERPAGO*"; trailing per-transaction codes (5+ digits, or letters+digits of 6+ chars; a
 * code glued to 3+ letters keeps the letters). The last remaining token is always kept. Trailing
 * whitespace and , ; : * - / go; a trailing period and inner punctuation stay.
 */
export function cardMerchantName(reference: string): string {
	const text = reference
		.trim()
		.replace(/^(?:[*KE]\s+)+/, '')
		.replace(/\s*USD\s*\d[\d.]*,\d{2}/gi, '')
		.replace(/(^|\s)\d{2}\/\d{2}(?=\s|$)/g, '$1')
		.replace(/^\s*MERPAGO\s*\*\s*/i, '');
	const tokens = text.split(/\s+/).filter(Boolean);
	while (tokens.length > 1) {
		const last = tokens[tokens.length - 1];
		const glued = /^([A-Za-z]{3,})\d{5,}$/.exec(last);
		if (glued) {
			tokens[tokens.length - 1] = glued[1];
			break;
		}
		if (/^\d{5,}$/.test(last) || /^(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9]{6,}$/.test(last)) tokens.pop();
		else break;
	}
	return tokens.join(' ').replace(/[\s,;:*\-/]+$/, '');
}

type TitleFields = {
	counterpartyNickname: string | null;
	merchant: string | null;
	kind: string;
	isCredit: boolean;
	rawDescription: string;
	/** Card statements: the cuota of an installment line, shown after the reference. */
	installment: string | null;
};

/** The list title of an item, also the default description of its movement. */
export function importTitle(i: TitleFields): string {
	// MP text comes padded sometimes; a blank value counts as absent.
	const clean = (s: string | null | undefined) => s?.trim() || null;
	if (isCardLine(i.kind)) {
		const name = cardMerchantName(i.merchant ?? '') || i.rawDescription.trim();
		return i.installment ? `${name} ${i.installment}` : name;
	}
	if (i.installment) return `${clean(i.merchant) ?? i.rawDescription.trim()} ${i.installment}`;
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
	const time = new Intl.DateTimeFormat(LOCALE, {
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
	isCredit: boolean;
	operationType: string | null;
	counterpartyId: string | null;
	merchant: string | null;
};

/** The rule keys an item can match, strongest first. */
export function importRuleKeys(i: ImportKeyFields): ImportRuleKey[] {
	const keys: ImportRuleKey[] = [];
	// A refund reverses its payment: learning from it would overwrite the payment's rule.
	if (i.kind === 'refund') return keys;
	// Same for a card credit (a reversed purchase); the taxes item keeps its kind key either way.
	if (i.isCredit && CARD_KINDS.includes(i.kind) && i.kind !== 'card_taxes') return keys;
	if (i.operationType === 'money_transfer' && i.counterpartyId)
		keys.push({ matchKind: 'counterparty', matchValue: i.counterpartyId });
	const raw = i.merchant?.trim().toLowerCase();
	if (isCardLine(i.kind)) {
		// Card keys drop per-transaction codes; the raw key stays as a lookup fallback for older rules.
		const name = cardMerchantName(i.merchant ?? '').toLowerCase();
		if (name) keys.push({ matchKind: 'merchant', matchValue: name });
		if (name && raw && raw !== name) keys.push({ matchKind: 'merchant', matchValue: raw });
	} else if (raw) keys.push({ matchKind: 'merchant', matchValue: raw });
	// A net-negative yield day must not share (and overwrite) the rule learned from the usual positive ones.
	const stable =
		i.kind === 'yield'
			? i.isCredit
			: ['payout', 'merchant_payout', 'account_fund', 'card_taxes'].includes(i.kind);
	if (stable) keys.push({ matchKind: 'kind', matchValue: i.kind });
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
				? isCardLine(i.kind)
					? cardMerchantName(i.merchant!)
					: i.merchant!.trim()
				: FALLBACK_TITLE[key.matchValue];
	return { key, label: label || importTitle(i) };
}

/** The user's item in any status, or undefined (foreign and missing ids alike). */
export async function getImport(userId: string, id: string) {
	const [row] = await db
		.select(itemColumns)
		.from(mpImportItems)
		.innerJoin(financialAccounts, eq(financialAccounts.id, mpImportItems.accountId))
		.where(and(eq(mpImportItems.id, id), canAccessImport(userId), canAccessAccount(userId)))
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
 * learn the rule (no rule is created or changed otherwise). `auto` stamps it as an automatic approval.
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
		const [claimed] = await tx
			.update(mpImportItems)
			.set({ status: 'approved', autoApprovedAt: auto ? sql`now()` : null })
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

/**
 * Undo of an approval, in one transaction: deletes the movement the approval created and puts the item
 * back to pending. 'changed' when the movement was edited meanwhile, 'stale' when the item is not an
 * approved one with a movement (still pending, rejected, or its movement was deleted); nothing is
 * written in either case. Rules are untouched: a quick approval never learns one. Undoing an automatic
 * approval also blocks the item from being auto-approved again (it stays for manual review).
 */
export function undoApproval(userId: string, id: string): Promise<'undone' | 'changed' | 'stale'> {
	return db.transaction(async (tx) => {
		const [item] = await tx
			.select({ movementId: mpImportItems.movementId })
			.from(mpImportItems)
			.where(
				and(eq(mpImportItems.id, id), canAccessImport(userId), eq(mpImportItems.status, 'approved'))
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

		await deleteMovement(userId, item.movementId, tx);
		await tx
			.update(mpImportItems)
			.set({
				status: 'pending',
				movementId: null,
				autoApprovedAt: null,
				autoApproveBlocked: sql`${mpImportItems.autoApproveBlocked} or ${mpImportItems.autoApprovedAt} is not null`
			})
			.where(and(eq(mpImportItems.id, id), canAccessImport(userId)));
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
			id: mpImportItems.id,
			kind: mpImportItems.kind,
			isCredit: mpImportItems.isCredit,
			amount: mpImportItems.amount,
			occurredAt: mpImportItems.occurredAt,
			counterpartyNickname: mpImportItems.counterpartyNickname,
			merchant: mpImportItems.merchant,
			rawDescription: mpImportItems.rawDescription,
			installment: mpImportItems.installment,
			currency: itemAccount.currency,
			autoApprovedAt: mpImportItems.autoApprovedAt,
			category: categories.name,
			counterAccount: counter.name
		})
		.from(mpImportItems)
		.innerJoin(movements, eq(movements.id, mpImportItems.movementId))
		.innerJoin(financialAccounts, eq(movements.accountId, financialAccounts.id))
		.innerJoin(itemAccount, eq(itemAccount.id, mpImportItems.accountId))
		.leftJoin(categories, eq(categories.id, movements.categoryId))
		.leftJoin(
			counter,
			eq(
				counter.id,
				sql`case when ${movements.accountId} = ${mpImportItems.accountId} then ${movements.destinationAccountId} else ${movements.accountId} end`
			)
		)
		.where(
			and(
				canAccessImport(userId),
				canAccessMovement(userId),
				canAccessAccount(userId, itemAccount),
				eq(mpImportItems.status, 'approved'),
				isNotNull(mpImportItems.autoApprovedAt),
				gt(mpImportItems.autoApprovedAt, sql`now() - interval '30 days'`)
			)
		)
		.orderBy(desc(mpImportItems.autoApprovedAt), desc(mpImportItems.occurredAt));
}
