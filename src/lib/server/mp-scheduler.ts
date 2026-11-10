import { pgErrorCode } from './db/errors';
import { dayStart, localDay, TZ } from './month';
import { syncIntervalHours } from './mp-env';
import { listUsableConnections, mpOauthEnabled } from './mp-oauth';
import { syncScheduled } from './mp-sync';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Buenos Aires hour of the daily release report: MP mails the account owner every time one is ready. */
const REPORT_HOUR = 8;
/** First run after a start: payments, plus the day's report if it was missed while the server was down. */
const START_DELAY_MS = 60_000;

/** True during the Buenos Aires hour the scheduler requests the daily release report. */
function isReportHour(now: Date): boolean {
	const hour = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' })
		.formatToParts(now)
		.find((p) => p.type === 'hour')?.value;
	return Number(hour) === REPORT_HOUR;
}

/**
 * Whether the scheduler still owes this account today's report: none since the last REPORT_HOUR, with an
 * hour of slack because synced_until trails the run and a manual sync shortly before counts.
 */
function reportDue(syncedUntil: Date | null, now: Date): boolean {
	if (!syncedUntil) return true;
	const today = dayStart(localDay(now));
	if (!today) return false;
	let last = today.getTime() + REPORT_HOUR * HOUR_MS;
	if (last > now.getTime()) last -= DAY_MS;
	return syncedUntil.getTime() < last - HOUR_MS;
}

/**
 * Syncs every usable connection one after another. Never throws; one user failing does not stop the rest.
 * Payments always; the release report only with `report` and when the account has not had one since the
 * last REPORT_HOUR (so a restart or a second container never requests it twice a day).
 */
async function runAll(report: boolean): Promise<void> {
	let users: string[];
	try {
		users = await listUsableConnections();
	} catch {
		console.error('mp sync failed: network');
		return;
	}
	for (const userId of users) {
		try {
			await syncScheduled(userId, (syncedUntil) => report && reportDue(syncedUntil, new Date()));
		} catch {
			console.error('mp sync failed: network');
		}
	}
}

/**
 * Starts the automatic sync when Mercado Pago is configured: no extra lock, because the DB lease inside
 * the sync keeps overlapping containers (start-first deploys) from syncing at once and reportDue keeps them
 * from requesting the daily report twice.
 */
export function startMpScheduler(): void {
	if (!mpOauthEnabled()) return;
	const hours = syncIntervalHours();
	if (hours === null) {
		console.error('mp sync scheduler: invalid MP_SYNC_INTERVAL_HOURS');
		return;
	}
	if (hours === 0) return;
	const run = (report: boolean) =>
		void runAll(report).catch((e) =>
			console.error(
				'mp sync scheduler: run failed',
				pgErrorCode(e) ?? (e as Error)?.name ?? 'unknown'
			)
		);
	setTimeout(() => run(true), START_DELAY_MS).unref();
	// Buenos Aires is a whole-hour offset, so every full hour is a full local hour: payments every `hours`
	// hours, the release report only at REPORT_HOUR.
	let tick = 0;
	const next = () => {
		const now = Date.now();
		const wait = Math.ceil((now + 1) / HOUR_MS) * HOUR_MS - now + 1_000;
		setTimeout(() => {
			tick++;
			const report = isReportHour(new Date());
			if (report || tick % hours === 0) run(report);
			next();
		}, wait).unref();
	};
	next();
}
