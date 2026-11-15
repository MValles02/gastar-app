import { eq, sql } from 'drizzle-orm';
import { userOwned } from './access';
import { db } from './db';
import { pgErrorCode } from './db/errors';
import { mpImportItems } from './db/schema';
import { autoApprovePending } from './import-approve';
import { importSource, type SourceId } from './import-sources';

const BATCH = 500;

/** Splits a list for a query that takes it as parameters (Postgres caps them per statement). */
export const batches = <T>(xs: T[]) =>
	Array.from({ length: Math.ceil(xs.length / BATCH) }, (_, i) =>
		xs.slice(i * BATCH, (i + 1) * BATCH)
	);

export type ImportRow = Omit<typeof mpImportItems.$inferInsert, 'userId' | 'source'>;

/** In an upsert's RETURNING: true when the row was inserted, false when an existing one was updated. */
const INSERTED = sql<boolean>`xmax = 0`;

/**
 * The only writer of import items, and the only place that auto-approves afterwards: stores the rows as
 * pending items of `source` (an existing external key follows the source's conflict policy), then approves
 * every pending item a learned rule recognizes, also when `rows` is empty (items stored earlier still
 * count). Auto-approval never fails the import. Returns how many items are new and how many were approved.
 */
export async function ingestImportItems(
	userId: string,
	source: SourceId,
	rows: ImportRow[]
): Promise<{ created: number; autoApproved: number }> {
	const { conflict } = importSource(source);
	const target = [mpImportItems.userId, mpImportItems.externalKey];
	// A key listed twice (a payment seen on two pages) would make an update-on-conflict insert fail.
	const unique = [...new Map(rows.map((r) => [r.externalKey, r])).values()];
	let created = 0;
	for (const batch of batches(unique)) {
		const insert = db
			.insert(mpImportItems)
			.values(batch.map((r) => ({ ...userOwned(userId), ...r, source })));
		const written = await (
			conflict === 'skip'
				? insert.onConflictDoNothing({ target })
				: insert.onConflictDoUpdate({
						target,
						// Also relabels, re-times and re-signs pending items from older syncs. Approved and rejected stay.
						set: {
							kind: sql`excluded.kind`,
							amount: sql`excluded.amount`,
							isCredit: sql`excluded.is_credit`,
							occurredAt: sql`excluded.occurred_at`,
							updatedAt: sql`now()`
						},
						setWhere: eq(mpImportItems.status, 'pending')
					})
		).returning({ inserted: INSERTED });
		created += written.filter((r) => r.inserted).length;
	}

	let autoApproved = 0;
	try {
		autoApproved = await autoApprovePending(userId);
	} catch (e) {
		console.error('[imports] auto-approve failed', pgErrorCode(e) ?? 'unknown');
	}
	return { created, autoApproved };
}
