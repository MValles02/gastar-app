import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { pgErrorCode } from '../../db/errors';
import { gmailConnections } from '../../db/schema';
import { gmailSyncIntervalMinutes } from './env';
import { gmailOauthEnabled } from './oauth';
import { runGmailSync } from './sync';

/** First run after a start. */
const START_DELAY_MS = 60_000;

/** Error name or DB code: enough to diagnose, never a message that could carry data. */
const errorDetail = (e: unknown) => pgErrorCode(e) ?? (e as Error)?.name ?? 'unknown';

/** Syncs every usable connection one after another. Never throws; one user failing does not stop the rest. */
async function runAll(): Promise<void> {
	let users: { userId: string }[];
	try {
		users = await db
			.select({ userId: gmailConnections.userId })
			.from(gmailConnections)
			.where(eq(gmailConnections.needsReconnect, false));
	} catch (e) {
		console.error('gmail sync failed: db', errorDetail(e));
		return;
	}
	for (const { userId } of users) {
		try {
			await runGmailSync(userId);
		} catch (e) {
			console.error('gmail sync failed: network', errorDetail(e));
		}
	}
}

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
