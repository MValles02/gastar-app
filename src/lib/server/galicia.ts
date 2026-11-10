import { and, eq, isNull } from 'drizzle-orm';
import { db } from './db';
import { financialAccounts, galiciaConnections } from './db/schema';
import { canAccessAccount, canAccessGaliciaConnection, galiciaConnectionOwnedBy } from './access';
import { type ImportRow, ingestImportItems } from './import-ingest';
import { KIND, kindTitle, SOURCE } from './import-sources';
import { dayStart } from './month';
import { StatementError, type Currency, type Statement } from './galicia-statement';

/** Active accounts of one currency: the only ones a statement's lines can land on. */
export function listStatementAccounts(userId: string, currency: Currency) {
	return db
		.select({
			id: financialAccounts.id,
			name: financialAccounts.name,
			icon: financialAccounts.icon,
			color: financialAccounts.color
		})
		.from(financialAccounts)
		.where(
			and(
				canAccessAccount(userId),
				eq(financialAccounts.currency, currency),
				isNull(financialAccounts.archivedAt)
			)
		)
		.orderBy(financialAccounts.name);
}

export async function getGaliciaConnection(userId: string) {
	const [row] = await db
		.select({
			arsAccountId: galiciaConnections.arsAccountId,
			usdAccountId: galiciaConnections.usdAccountId
		})
		.from(galiciaConnections)
		.where(canAccessGaliciaConnection(userId))
		.limit(1);
	return row;
}

/** Saves the pesos or dollar account (creating the connection). False unless it is the user's, active and of that currency. */
export async function setGaliciaAccount(
	userId: string,
	currency: Currency,
	accountId: string
): Promise<boolean> {
	if (!(await listStatementAccounts(userId, currency)).some((a) => a.id === accountId))
		return false;
	const set = currency === 'ARS' ? { arsAccountId: accountId } : { usdAccountId: accountId };
	await db
		.insert(galiciaConnections)
		.values({ ...galiciaConnectionOwnedBy(userId), ...set })
		.onConflictDoUpdate({ target: galiciaConnections.userId, set });
	return true;
}

export type StatementImport =
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
	const source = s.network === 'visa' ? SOURCE.galiciaVisa : SOURCE.galiciaMastercard;
	const conn = await getGaliciaConnection(userId);
	const accounts = {} as Record<Currency, string>;
	const taxes: ImportRow[] = [];
	for (const c of ['ARS', 'USD'] as const) {
		const net = s.charges[c];
		if (net === 0 && !s.consumos.some((l) => l.currency === c)) continue;
		const id = c === 'ARS' ? conn?.arsAccountId : conn?.usdAccountId;
		if (!id || !(await listStatementAccounts(userId, c)).some((a) => a.id === id))
			return { ok: false, missing: c };
		accounts[c] = id;
		if (net === 0) continue;
		taxes.push({
			accountId: id,
			externalKey: ['galicia', s.network, 'taxes', s.numberHash, c].join(':'),
			kind: KIND.cardTaxes,
			occurredAt: day(s.closing),
			amount: Math.abs(net),
			isCredit: net < 0,
			sourceId: '',
			rawDescription: kindTitle(source, KIND.cardTaxes)
		});
	}

	const seen = new Map<string, number>();
	const rows: ImportRow[] = [];
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
		rows.push({
			accountId: accounts[l.currency]!,
			externalKey: n === 1 ? base : `${base}#${n}`,
			kind: l.installment ? KIND.cardInstallment : KIND.cardPurchase,
			occurredAt: day(l.installment ? s.closing : l.date),
			amount: Math.abs(l.cents),
			isCredit: l.cents < 0,
			sourceId: l.voucher ?? '',
			rawDescription: l.installment ? `${l.reference} ${l.installment}` : l.reference,
			merchant: l.reference,
			installment: l.installment
		});
	}
	const { created, autoApproved } = await ingestImportItems(userId, source, [...rows, ...taxes]);
	return { ok: true, created, autoApproved };
}
