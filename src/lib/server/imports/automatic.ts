import type { SyncPhase } from '#lib/imports.ts';
import { dayStart, localDay } from '../month';
import { gmailConnection, gmailOauthEnabled, revokeGmail } from './gmail/oauth';
import { startGmailScheduler } from './gmail/scheduler';
import { acquireGmailSync, gmailErrorLabel } from './gmail/sync';
import { mpErrorLabel } from './mercado-pago/client';
import { mpConnection, mpOauthEnabled } from './mercado-pago/oauth';
import { startMpScheduler } from './mercado-pago/scheduler';
import { getSyncState, runMpSync } from './mercado-pago/sync';
import { earliestImportDay, getImportFromDay, setImportFrom } from './settings';
import { leaseActive } from './sync-kit';

// The automatic import sources (Mercado Pago, Gmail alerts) as routes, hooks and account deletion see
// them: their status, a manual sync, the shared "Importar desde" date, the schedulers and the grants.

export type SourceStatus = {
	/** Mercado Pago is 'linked' once it has a receiving account; null when not linked. */
	state: 'linked' | 'reconnect' | null;
	/** A sync holds the lease. */
	running: boolean;
	lastRunAt: Date | null;
	/** Why the last sync failed, for "No se pudo sincronizar (…)"; null when it did not. */
	errorLabel: string | null;
};

export type MpStatus = SourceStatus & {
	/** The account the connection feeds, also while a reconnect is pending. */
	accountId: string | null;
	/** The inbox progress of the current or last run; `phase` only while running. */
	progress: { phase: SyncPhase | null; newItems: number | null; autoApproved: number | null };
};

/** Whether any automatic source is configured on this server. */
export const automaticEnabled = () => mpOauthEnabled() || gmailOauthEnabled();

async function mpStatus(userId: string): Promise<MpStatus> {
	const conn = await mpConnection(userId);
	const accountId = conn?.accountId ?? null;
	const sync = accountId ? await getSyncState(userId, accountId) : null;
	const running = leaseActive(sync?.runningSince);
	return {
		state: conn?.needsReconnect ? 'reconnect' : accountId ? 'linked' : null,
		running,
		lastRunAt: sync?.lastRunAt ?? null,
		errorLabel: sync?.lastError ? mpErrorLabel(sync.lastError) : null,
		accountId,
		progress: {
			// 'payments' (also before the first step is recorded) or 'report'.
			phase: running ? (sync?.phase === 'report' ? 'report' : 'payments') : null,
			newItems: sync?.newItems ?? null,
			autoApproved: sync?.autoApproved ?? null
		}
	};
}

async function gmailStatus(userId: string): Promise<SourceStatus> {
	const conn = await gmailConnection(userId);
	return {
		state: conn ? (conn.needsReconnect ? 'reconnect' : 'linked') : null,
		running: leaseActive(conn?.runningSince),
		lastRunAt: conn?.lastRunAt ?? null,
		errorLabel: conn?.lastErrorCode ? gmailErrorLabel(conn.lastErrorCode) : null
	};
}

/** Each automatic source of the user; null for one that is not configured on this server. */
export async function sourceStatus(
	userId: string
): Promise<{ mp: MpStatus | null; gmail: SourceStatus | null }> {
	const [mp, gmail] = await Promise.all([
		mpOauthEnabled() ? mpStatus(userId) : null,
		gmailOauthEnabled() ? gmailStatus(userId) : null
	]);
	return { mp, gmail };
}

/**
 * "Sincronizar": Gmail runs to the end, Mercado Pago goes on in the background while the inbox polls it.
 * False when neither source can sync (Gmail not linked or reconnecting, Mercado Pago without an account).
 */
export async function syncNow(userId: string): Promise<boolean> {
	const { mp, gmail } = await sourceStatus(userId);
	const gmailOn = gmail?.state === 'linked';
	const mpOn = !!mp?.accountId;
	if (!gmailOn && !mpOn) return false;
	if (gmailOn) await (await acquireGmailSync(userId))?.run();
	if (mpOn) await runMpSync(userId, { report: true, background: true });
	return true;
}

const BUSY = 'Ya hay una sincronización en curso. Probá en unos minutos.';

/**
 * Sets the "Importar desde" day of every automatic source. Moving it earlier fetches the gap: both leases are
 * taken first (a busy one cancels the change), the date is stored, then the syncs run in the background.
 * Same or later only trims what is already here, which waits for any running sync.
 */
export async function changeImportFrom(
	userId: string,
	ymd: string
): Promise<{ ok: true } | { status: 400 | 409; error: string }> {
	const from = dayStart(ymd);
	if (!from || ymd > localDay(new Date())) return { status: 400, error: 'Elegí una fecha válida.' };
	if (ymd < earliestImportDay()) {
		return { status: 400, error: 'Podés traer hasta 12 meses para atrás.' };
	}
	const { mp, gmail } = await sourceStatus(userId);
	if (mp?.state === 'reconnect') return { status: 400, error: 'Reconectá Mercado Pago primero.' };
	if (gmail?.state === 'reconnect') return { status: 400, error: 'Reconectá Gmail primero.' };
	// Mercado Pago without a receiving account has nothing to fetch or trim: skipped.
	const mpAccount = mp?.accountId;

	if (ymd < (await getImportFromDay(userId))) {
		const gmailLinked = gmail?.state === 'linked';
		const lease = gmailLinked ? await acquireGmailSync(userId) : null;
		if (gmailLinked && !lease) return { status: 409, error: BUSY };
		if (mpAccount && !(await runMpSync(userId, { from, report: true, background: true }))) {
			await lease?.release();
			return { status: 409, error: BUSY };
		}
		// Before the Gmail conversion, so its floor does not drop the backfilled alerts.
		try {
			await setImportFrom(userId, from);
		} catch (error) {
			await lease?.release();
			throw error;
		}
		// Runs on in the background and releases the lease when it ends.
		void lease?.run();
		return { ok: true };
	}
	// Trimming while a run holds a lease would let it re-insert what was just deleted.
	const now = await sourceStatus(userId);
	if (now.mp?.running || now.gmail?.running) return { status: 409, error: BUSY };
	await setImportFrom(userId, from);
	return { ok: true };
}

export function startImportSchedulers(): void {
	startMpScheduler();
	startGmailScheduler();
}

/** Best effort, never throws: revokes the user's grants at the providers before the account is deleted. */
export async function revokeImportGrants(userId: string): Promise<void> {
	// Only the Gmail grant is revoked; the Mercado Pago connection row goes with the account.
	await revokeGmail(userId);
}
