import { and, eq, like, lt, min, or, isNull } from 'drizzle-orm';
import { DAY_MS } from '#lib/dates.ts';
import { canAccessOwn, userOwned } from '../access';
import { db } from '../db';
import { importSettings, importItems } from '../db/schema';
import { dayStart, localDay } from '../month';
import { ALERT_KEYS } from './keys';
import { withMatchLock } from './match-lock';
import { SOURCE } from '#lib/imports.ts';

/** How far back "Importar desde" may reach. */
export const MAX_BACKFILL_DAYS = 365;
export const earliestImportDay = () => localDay(new Date(Date.now() - MAX_BACKFILL_DAYS * DAY_MS));

/** How far back a first sync reaches when the user has not chosen an "importar desde" day. */
export const DEFAULT_BACKFILL_DAYS = 30;

/** How long an automatically approved item stays in the "approved automatically" list. */
export const AUTO_APPROVED_DAYS = 30;

/** First-sync start: the user's "importar desde" floor, else DEFAULT_BACKFILL_DAYS ago; null on a bad clock. */
export function backfillStart(now: number, floor: Date | null): Date | null {
	return floor ?? dayStart(localDay(new Date(now - DEFAULT_BACKFILL_DAYS * DAY_MS)));
}

/** Items of an automatic source: Mercado Pago and Gmail alerts (statement items are uploaded). */
const isAutomaticItem = () =>
	or(eq(importItems.source, SOURCE.mercadoPago), like(importItems.externalKey, ALERT_KEYS));

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
			.select({ at: min(importItems.occurredAt) })
			.from(importItems)
			.where(and(canAccessOwn(userId, importItems), isAutomaticItem()));
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
		.delete(importItems)
		.where(
			and(
				canAccessOwn(userId, importItems),
				eq(importItems.status, 'pending'),
				eq(importItems.source, SOURCE.mercadoPago),
				lt(importItems.occurredAt, from)
			)
		);
	await withMatchLock(userId, () =>
		db
			.delete(importItems)
			.where(
				and(
					canAccessOwn(userId, importItems),
					eq(importItems.status, 'pending'),
					like(importItems.externalKey, ALERT_KEYS),
					isNull(importItems.aliasKey),
					lt(importItems.occurredAt, from)
				)
			)
	);
}
