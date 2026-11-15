import { and, eq, lt, min } from 'drizzle-orm';
import { DAY_MS } from '#lib/dates.ts';
import type { Currency } from '#lib/money.ts';
import { canAccessOwn } from '../../access';
import { db } from '../../db';
import { mpConnections, mpImportItems } from '../../db/schema';
import { localDay } from '../../month';
import { isActiveAccountIn } from '../connections';

/** Mercado Pago accounts are in pesos: the receiving account must be too. */
export const MP_CURRENCY = 'ARS' satisfies Currency;

/** How far back a first sync reaches when the user has not chosen an "importar desde" day. */
export const DEFAULT_BACKFILL_DAYS = 30;

/** Saves the receiving account. False when the account is not the user's, active and ARS, or there is no connection. */
export async function setReceivingAccount(userId: string, accountId: string): Promise<boolean> {
	if (!(await isActiveAccountIn(userId, MP_CURRENCY, accountId))) return false;
	const rows = await db
		.update(mpConnections)
		.set({ accountId })
		.where(canAccessOwn(userId, mpConnections))
		.returning({ userId: mpConnections.userId });
	return rows.length > 0;
}

/** The effective "importar desde" day (`YYYY-MM-DD`): the chosen one, else the earliest imported item's day, else 30 days back. */
export async function getImportFromDay(userId: string, accountId: string): Promise<string> {
	const [row] = await db
		.select({ chosen: mpConnections.importFrom })
		.from(mpConnections)
		.where(canAccessOwn(userId, mpConnections))
		.limit(1);
	if (row?.chosen) return localDay(row.chosen);
	const [first] = await db
		.select({ at: min(mpImportItems.occurredAt) })
		.from(mpImportItems)
		.where(and(canAccessOwn(userId, mpImportItems), eq(mpImportItems.accountId, accountId)));
	return localDay(first?.at ?? new Date(Date.now() - DEFAULT_BACKFILL_DAYS * DAY_MS));
}

/** Saves "importar desde" and drops the pending items of the account before it (approved and rejected ones stay). */
export async function setImportFrom(userId: string, accountId: string, from: Date): Promise<void> {
	await db
		.update(mpConnections)
		.set({ importFrom: from })
		.where(canAccessOwn(userId, mpConnections));
	await db
		.delete(mpImportItems)
		.where(
			and(
				canAccessOwn(userId, mpImportItems),
				eq(mpImportItems.accountId, accountId),
				eq(mpImportItems.status, 'pending'),
				lt(mpImportItems.occurredAt, from)
			)
		);
}
