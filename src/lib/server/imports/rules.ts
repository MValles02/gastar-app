import { APP_TZ, formatDay, LOCALE } from '#lib/locale.ts';
import { roundToStep, type Currency } from '#lib/money.ts';
import { kindFits, type MovementType } from '#lib/movement.ts';
import { localDay } from '../month';
import { type Kind, type SourceId } from '#lib/imports.ts';
import { importSource, kindSpec } from './sources';
import type { ImportRule } from './store';

// Pure: what an item is called, which rule keys it has and what its review form starts from.

type TitleFields = {
	source: SourceId;
	counterpartyNickname: string | null;
	merchant: string | null;
	kind: Kind;
	isCredit: boolean;
	rawDescription: string;
	/** Card statements: the cuota of an installment line, shown after the reference. */
	installment: string | null;
	/** Galicia Mastercard purchase in N cuotas: the item is its first cuota and the cuota suffix is dropped. */
	installments?: number | null;
};

/** What an installment purchase of `total` in `n` cuotas books: the first cuota (it carries the remainder) and the rule's cuota. */
export function installmentAmounts(total: number, n: number, currency: Currency) {
	const cuota = Math.floor(total / n);
	return { first: total - (n - 1) * cuota, cuota, rule: roundToStep(cuota, currency) };
}

/** The last month ('YYYY-MM') of `n` cuotas whose first is in the month of the local day `day`. */
export function installmentEndsMonth(day: string, n: number): string {
	const t = Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1 + n - 1;
	return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

/** The list title of an item, also the default description of its movement. */
export function importTitle(i: TitleFields): string {
	const { title, titleWithWho } = kindSpec(i.source, i.kind);
	// MP text comes padded sometimes; a blank value counts as absent.
	const clean = (s: string | null | undefined) => s?.trim() || null;
	const who =
		clean(i.counterpartyNickname) ?? clean(importSource(i.source).merchantName(i.merchant));
	const fixed =
		typeof title === 'string' ? title : title ? (i.isCredit ? title.credit : title.debit) : null;
	const base = titleWithWho
		? who
			? `${fixed} · ${who}`
			: fixed
		: (who ?? fixed ?? i.rawDescription.trim());
	return i.installment && !i.installments ? `${base} ${i.installment}` : base!;
}

/** dd/mm/aaaa hh:mm, 24 h, Buenos Aires, or just the day for a source whose items carry no time. */
export function importDateLabel(source: SourceId, d: Date): string {
	if (!importSource(source).timed) return formatDay(localDay(d));
	const time = new Intl.DateTimeFormat(LOCALE, {
		timeZone: APP_TZ,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).format(d);
	return `${formatDay(localDay(d))} ${time}`;
}

/** A credit becomes an income or a transfer in; a debit an outcome or a transfer out. */
export const importTypes = (i: {
	isCredit: boolean;
	installments?: number | null;
}): MovementType[] =>
	i.installments ? ['outcome'] : i.isCredit ? ['income', 'transfer'] : ['outcome', 'transfer'];

type ImportRuleKey = { matchKind: 'counterparty' | 'merchant' | 'kind'; matchValue: string };
type ImportKeyFields = {
	/** The fixed payment of a later cuota line (see linkInstallmentLines); null otherwise. */
	recurringId?: string | null;
	source: SourceId;
	kind: Kind;
	isCredit: boolean;
	operationType: string | null;
	counterpartyId: string | null;
	merchant: string | null;
};

/** The rule keys an item can match, strongest first. */
function importRuleKeys(i: ImportKeyFields): ImportRuleKey[] {
	const { learns, kindKey } = kindSpec(i.source, i.kind);
	if (learns === 'never' || (learns === 'debit' && i.isCredit)) return [];
	const keys: ImportRuleKey[] = [];
	if (i.operationType === 'money_transfer' && i.counterpartyId)
		keys.push({ matchKind: 'counterparty', matchValue: i.counterpartyId });
	// The name drops per-transaction codes; the raw key stays as a lookup fallback for older rules.
	const name = importSource(i.source).merchantName(i.merchant).toLowerCase();
	const raw = i.merchant?.trim().toLowerCase();
	if (name) keys.push({ matchKind: 'merchant', matchValue: name });
	if (name && raw && raw !== name) keys.push({ matchKind: 'merchant', matchValue: raw });
	if (kindKey === 'always' || kindKey === 'lookup' || (kindKey === 'credit' && i.isCredit))
		keys.push({ matchKind: 'kind', matchValue: i.kind });
	return keys;
}

/**
 * The key an approval may remember and who it names ("Recordar para …"), or null when the item has no
 * stable key. Existing rules on other keys still prefill (importRuleKeys); this only gates new ones.
 */
export function rememberKey(
	i: ImportKeyFields & TitleFields
): { key: ImportRuleKey; label: string } | null {
	const key = importRuleKeys(i)[0];
	const { title, kindKey } = kindSpec(i.source, i.kind);
	if (!key || (key.matchKind === 'kind' && kindKey === 'lookup')) return null;
	const label =
		key.matchKind === 'counterparty'
			? i.counterpartyNickname?.trim() || null
			: key.matchKind === 'merchant'
				? importSource(i.source).merchantName(i.merchant)
				: typeof title === 'string'
					? title
					: null;
	return { key, label: label || importTitle(i) };
}

type ImportPrefill = {
	type: MovementType;
	categoryId: string;
	counterAccountId: string;
	description: string;
	/** Fixed payment remembered on the rule; '' for none or a transfer. */
	recurringId: string;
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
	accounts: { id: string; name: string }[],
	fixed: { id: string; description: string; categoryId: string }[] = []
): ImportPrefill {
	const title = importTitle(item);
	// A later cuota line of an installment purchase belongs to that purchase's fixed payment.
	const own = item.recurringId ? fixed.find((r) => r.id === item.recurringId) : undefined;
	const ownCategory =
		own && categories.find((c) => c.id === own.categoryId && kindFits(c.kind, 'outcome'));
	if (own && ownCategory && !item.isCredit)
		return {
			type: 'outcome',
			categoryId: ownCategory.id,
			counterAccountId: '',
			description: own.description,
			recurringId: own.id,
			suggestion: ownCategory.name,
			review: false
		};
	const rule = importRuleKeys(item)
		.map((k) => rules.find((r) => r.matchKind === k.matchKind && r.matchValue === k.matchValue))
		.find((r) => r !== undefined);
	if (rule && importTypes(item).includes(rule.type)) {
		const target =
			rule.type === 'transfer'
				? accounts.find((a) => a.id === rule.counterAccountId)
				: categories.find((c) => c.id === rule.categoryId && kindFits(c.kind, rule.type));
		if (target)
			return {
				type: rule.type,
				categoryId: rule.type === 'transfer' ? '' : target.id,
				counterAccountId: rule.type === 'transfer' ? target.id : '',
				description: rule.description ?? title,
				recurringId: rule.type === 'transfer' || item.installments ? '' : (rule.recurringId ?? ''),
				suggestion: target.name,
				review: false
			};
	}
	const { transfer, review } = kindSpec(item.source, item.kind);
	const type: MovementType = transfer ? 'transfer' : item.isCredit ? 'income' : 'outcome';
	return {
		type,
		categoryId: '',
		counterAccountId: '',
		description: title,
		recurringId: '',
		suggestion: null,
		review: !!review
	};
}
