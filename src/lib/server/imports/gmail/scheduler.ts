import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { gmailConnections } from '../../db/schema';
import { runEach, START_DELAY_MS } from '../sync-kit';
import { gmailSyncIntervalMinutes } from './env';
import { gmailOauthEnabled } from './oauth';
import { runGmailSync } from './sync';

/** Syncs every usable connection one after another. Never throws; one user failing does not stop the rest. */
const runAll = () =>
	runEach(
		async () =>
			(
				await db
					.select({ userId: gmailConnections.userId })
					.from(gmailConnections)
					.where(eq(gmailConnections.needsReconnect, false))
			).map((r) => r.userId),
		runGmailSync,
		'gmail'
	);

/**
 * Starts the automatic sync when the Gmail link is configured: no extra lock, because the DB lease inside
 * the sync keeps overlapping containers (start-first deploys) from syncing the same user at once.
 */
export function startGmailScheduler(): void {
	if (!gmailOauthEnabled()) return;
	const minutes = gmailSyncIntervalMinutes();
	if (minutes === null) {
		console.error('gmail sync scheduler: invalid GMAIL_SYNC_INTERVAL_MINUTES');
		return;
	}
	if (minutes === 0) return;
	setTimeout(() => void runAll(), START_DELAY_MS).unref();
	setInterval(() => void runAll(), minutes * 60_000).unref();
}
