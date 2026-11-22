import * as env from '$app/env/private';
import type { EnvGroup } from '../../env-check';

/** The Gmail link's env vars: all or none (checkEnv). */
export const GMAIL_ENV = {
	vars: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_TOKEN_KEY'],
	key: 'GMAIL_TOKEN_KEY',
	allOrNone: true
} as const satisfies EnvGroup;

/** Google's OAuth authorization root; overridden in tests only. */
export const gmailAuthBaseUrl = () => env.GMAIL_AUTH_BASE_URL || 'https://accounts.google.com';

/**
 * Google's token and revoke endpoints root; overridden in tests only. The Gmail API calls of the sync
 * use the same override (gmailDataBaseUrl), so the fake serves them too.
 */
export const gmailApiBaseUrl = () => env.GMAIL_API_BASE_URL || 'https://oauth2.googleapis.com';

/** The Gmail API root of the sync: the same test override as the tokens, another real host. */
export const gmailDataBaseUrl = () => env.GMAIL_API_BASE_URL || 'https://gmail.googleapis.com';

/** Minutes between automatic syncs: 15 when unset, 0 = off, null when the value is invalid. */
export function gmailSyncIntervalMinutes(): number | null {
	const raw = env.GMAIL_SYNC_INTERVAL_MINUTES;
	const minutes = raw === undefined || raw === '' ? 15 : Number(raw);
	return Number.isInteger(minutes) && minutes >= 0 ? minutes : null;
}
