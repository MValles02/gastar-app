import { and, eq, like, lt, min, or, isNull } from 'drizzle-orm';
import { DAY_MS } from '#lib/dates.ts';
import { canAccessOwn, userOwned } from '../access';
import { db } from '../db';
import { importSettings, mpImportItems } from '../db/schema';
import { localDay } from '../month';
import { withMatchLock } from './galicia/matching';
import { DEFAULT_BACKFILL_DAYS } from './mercado-pago/settings';
import { SOURCE } from './sources';

/** How far back "Importar desde" may reach. */
export const MAX_BACKFILL_DAYS = 365;
export const earliestImportDay = () => localDay(new Date(Date.now() - MAX_BACKFILL_DAYS * DAY_MS));

const ALERT_KEY = 'alert:%';

/**
 * The user's chosen "Importar desde" (a local day start) from import_settings, or null when none.
 */
export async function getChosenImportFrom(userId: string): Promise<Date | null> {
	const [row] = await db
		.select({ from: importSettings.importFrom })
		.from(importSettings)
		.where(canAccessOwn(userId, importSettings))
		.limit(1);
	return row?.from ?? null;
}

/**
 * The effective "importar desde" day (`YYYY-MM-DD`): the chosen one, else the earliest automatic item's day
 * (Mercado Pago and Gmail alerts; statement items are not filtered by it), else 30 days back; never earlier
 * than the 12-month limit.
 */
export async function getImportFromDay(userId: string): Promise<string> {
	const chosen = await getChosenImportFrom(userId);
	let day: string;
	if (chosen) day = localDay(chosen);
	else {
		const [first] = await db
			.select({ at: min(mpImportItems.occurredAt) })
			.from(mpImportItems)
			.where(
				and(
					canAccessOwn(userId, mpImportItems),
					or(
						eq(mpImportItems.source, SOURCE.mercadoPago),
						like(mpImportItems.externalKey, ALERT_KEY)
					)
				)
			);
		day = localDay(first?.at ?? new Date(Date.now() - DEFAULT_BACKFILL_DAYS * DAY_MS));
	}
	const earliest = earliestImportDay();
	return day < earliest ? earliest : day;
}

/**
 * Saves "importar desde" and drops the pending Mercado Pago and Gmail-alert items before it (approved and
 * rejected ones stay; an alert item linked to a statement line stands for it and stays too).
 */
export async function setImportFrom(userId: string, from: Date): Promise<void> {
	await db
		.insert(importSettings)
		.values({ ...userOwned(userId), importFrom: from })
		.onConflictDoUpdate({ target: importSettings.userId, set: { importFrom: from } });
	await db
		.delete(mpImportItems)
		.where(
			and(
				canAccessOwn(userId, mpImportItems),
				eq(mpImportItems.status, 'pending'),
				eq(mpImportItems.source, SOURCE.mercadoPago),
				lt(mpImportItems.occurredAt, from)
			)
		);
	await withMatchLock(userId, () =>
		db
			.delete(mpImportItems)
			.where(
				and(
					canAccessOwn(userId, mpImportItems),
					eq(mpImportItems.status, 'pending'),
					like(mpImportItems.externalKey, ALERT_KEY),
					isNull(mpImportItems.aliasKey),
					lt(mpImportItems.occurredAt, from)
				)
			)
	);
}
