import { CURRENCIES, type Currency } from '#lib/money.ts';
import { db } from '../../db';
import { cardStatements, galiciaConnections } from '../../db/schema';
import { userOwned } from '../../access';
import { dayStart } from '../../month';
import { getGaliciaConnection, isActiveAccountIn } from '../connections';
import { type ImportRow, ingestImportItems } from '../ingest';
import { GALICIA_SOURCE, KIND, kindSpec } from '../sources';
import { matchStatement } from './matching';
import { StatementError, type Statement, type StatementLine } from './statement';

type GaliciaConnection = Awaited<ReturnType<typeof getGaliciaConnection>>;

const accountFor = (conn: GaliciaConnection, c: Currency) =>
	({ ARS: conn?.arsAccountId, USD: conn?.usdAccountId })[c];

/** Saves the pesos or dollar account (creating the connection). False unless it is the user's, active and of that currency. */
export async function setGaliciaAccount(
	userId: string,
	currency: Currency,
	accountId: string
): Promise<boolean> {
	if (!(await isActiveAccountIn(userId, currency, accountId))) return false;
	const set = { ARS: { arsAccountId: accountId }, USD: { usdAccountId: accountId } }[currency];
	await db
		.insert(galiciaConnections)
		.values({ ...userOwned(userId), ...set })
		.onConflictDoUpdate({ target: galiciaConnections.userId, set });
	return true;
}

type StatementImport =
	{ ok: true; created: number; autoApproved: number } | { ok: false; missing: Currency };

/**
 * Stores a parsed, reconciled statement as pending import items (see ingestImportItems): one item per
 * consumo line (installments dated at closing, single purchases at the purchase date) and one taxes
 * item per currency with a non-zero net. Items already imported (same external key) are skipped, so
 * re-uploading a statement creates nothing. `missing` when a currency it needs has no active account.
 */
export async function importStatement(userId: string, s: Statement): Promise<StatementImport> {
	const day = (ymd: string) => {
		const d = dayStart(ymd);
		if (!d) throw new StatementError('unreadable');
		return d;
	};
	const source = GALICIA_SOURCE[s.network];
	const conn = await getGaliciaConnection(userId);
	const accounts = {} as Record<Currency, string>;
	for (const c of CURRENCIES) {
		if (s.charges[c] === 0 && !s.consumos.some((l) => l.currency === c)) continue;
		const id = accountFor(conn, c);
		if (!id || !(await isActiveAccountIn(userId, c, id))) return { ok: false, missing: c };
		accounts[c] = id;
	}
	const taxes: ImportRow[] = CURRENCIES.filter((c) => s.charges[c] !== 0).map((c) => ({
		accountId: accounts[c],
		externalKey: ['galicia', s.network, 'taxes', s.numberHash, c].join(':'),
		kind: KIND.cardTaxes,
		occurredAt: day(s.closing),
		amount: Math.abs(s.charges[c]),
		isCredit: s.charges[c] < 0,
		sourceId: '',
		rawDescription: kindSpec(source, KIND.cardTaxes).title as string
	}));

	const seen = new Map<string, number>();
	const lines: { key: string; line: StatementLine; row: ImportRow }[] = [];
	for (const l of s.consumos) {
		if (l.cents === 0) continue;
		const base = [
			'galicia',
			s.network,
			l.voucher ?? '',
			l.installment ?? '',
			l.date,
			l.currency,
			l.cents
		].join(':');
		// Identical lines in one statement stay distinct items; the same statement again maps 1:1.
		const n = (seen.get(base) ?? 0) + 1;
		seen.set(base, n);
		const key = n === 1 ? base : `${base}#${n}`;
		const row: ImportRow = {
			accountId: accounts[l.currency]!,
			externalKey: key,
			kind: l.installment ? KIND.cardInstallment : KIND.cardPurchase,
			occurredAt: day(l.installment ? s.closing : l.date),
			amount: Math.abs(l.cents),
			isCredit: l.cents < 0,
			sourceId: l.voucher ?? '',
			rawDescription: l.installment ? `${l.reference} ${l.installment}` : l.reference,
			merchant: l.reference,
			installment: l.installment
		};
		lines.push({ key, line: l, row });
	}
	// After the reconciliation (the parser already threw if the statement does not add up).
	const { rows, diffs } = await matchStatement(userId, source, s.closing, lines);
	const { created, autoApproved } = await ingestImportItems(userId, source, [
		...rows,
		...diffs,
		...taxes
	]);
	await db
		.insert(cardStatements)
		.values({ ...userOwned(userId), source, numberHash: s.numberHash, closing: s.closing })
		.onConflictDoNothing();
	return { ok: true, created, autoApproved };
}
