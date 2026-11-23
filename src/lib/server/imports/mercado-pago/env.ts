import * as env from '$app/env/private';
import type { EnvGroup } from '../../env-check';

/**
 * The Mercado Pago link's env vars. Not all-or-none: a partial set only leaves the link off, as before
 * checkEnv read these groups (enforcing it could stop a deploy that starts today).
 */
export const MP_ENV = {
	vars: ['MP_CLIENT_ID', 'MP_CLIENT_SECRET', 'MP_TOKEN_KEY'],
	key: 'MP_TOKEN_KEY',
	allOrNone: false
} as const satisfies EnvGroup;

/** Mercado Pago's API root; overridden in tests only. */
export const mpApiBaseUrl = () => env.MP_API_BASE_URL || 'https://api.mercadopago.com';

/** Milliseconds between report-ready checks; tests shorten it. */
export const reportPollMs = () => Number(env.MP_REPORT_POLL_MS) || 15_000;

/** Milliseconds to wait for a report before giving up; tests shorten it. */
export const reportTimeoutMs = () => Number(env.MP_REPORT_TIMEOUT_MS) || 5 * 60_000;

/** Whole hours between automatic payment syncs: 1 when unset, 0 = off, null when the value is invalid. */
export function syncIntervalHours(): number | null {
	const raw = env.MP_SYNC_INTERVAL_HOURS;
	const hours = raw === undefined || raw === '' ? 1 : Number(raw);
	return Number.isInteger(hours) && hours >= 0 ? hours : null;
}
