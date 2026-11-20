import { CURRENCIES, type Currency } from '#lib/money.ts';
import { db } from '../../db';
import { cardStatements } from '../../db/schema';
import { userOwned } from '../../access';
import { dayStart } from '../../month';
import { isActiveAccountIn } from '../connections';
import { type ImportRow, ingestImportItems } from '../ingest';
import { statementLineKey, statementTaxesKey } from '../keys';
import { withMatchLock } from '../match-lock';
import { GALICIA_SOURCE, KIND } from '#lib/imports.ts';
import { kindSpec } from '../sources';
import { getGaliciaConnection } from './connection';
import { linkInstallmentLines, matchStatement } from './matching';
import { StatementError, type Statement, type StatementLine } from './statement';

type GaliciaConnection = Awaited<ReturnType<typeof getGaliciaConnection>>;

const accountFor = (conn: GaliciaConnection, c: Currency) =>
	({ ARS: conn?.arsAccountId, USD: conn?.usdAccountId })[c];

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
		externalKey: statementTaxesKey(s.network, s.numberHash, c),
		kind: KIND.cardTaxes,
		occurredAt: day(s.closing),
		amount: Math.abs(s.charges[c]),
		isCredit: s.charges[c] < 0,
		sourceId: null,
		rawDescription: kindSpec(source, KIND.cardTaxes).title as string
	}));

	const seen = new Map<string, number>();
	const lines: { key: string; line: StatementLine; row: ImportRow }[] = [];
	for (const l of s.consumos) {
		if (l.cents === 0) continue;
		const parts = { network: s.network, ...l };
		const base = statementLineKey(parts, 1);
		// Identical lines in one statement stay distinct items; the same statement again maps 1:1.
		const n = (seen.get(base) ?? 0) + 1;
		seen.set(base, n);
		const key = statementLineKey(parts, n);
		const row: ImportRow = {
			accountId: accounts[l.currency]!,
			externalKey: key,
			kind: l.installment ? KIND.cardInstallment : KIND.cardPurchase,
			occurredAt: day(l.installment ? s.closing : l.date),
			amount: Math.abs(l.cents),
			isCredit: l.cents < 0,
			sourceId: l.voucher ?? null,
			rawDescription: l.installment ? `${l.reference} ${l.installment}` : l.reference,
			merchant: l.reference,
			installment: l.installment
		};
		lines.push({ key, line: l, row });
	}
	const { created, autoApproved } = await withMatchLock(userId, async () => {
		const { rows, diffs } = await matchStatement(userId, source, s.closing, lines);
		// Later cuotas (k/N, k >= 2) of an approved installment purchase join its fixed payment.
		await linkInstallmentLines(userId, source, lines);
		// Before the ingest: its automatic approvals size installment fixed payments from this closing.
		await db
			.insert(cardStatements)
			.values({ ...userOwned(userId), source, numberHash: s.numberHash, closing: s.closing })
			.onConflictDoNothing();
		return ingestImportItems(userId, source, [...rows, ...diffs, ...taxes]);
	});
	return { ok: true, created, autoApproved };
}
