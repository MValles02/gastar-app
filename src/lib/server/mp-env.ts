import { env } from '$env/dynamic/private';

/** Mercado Pago's API root; overridden in tests only. */
export const mpApiBaseUrl = () => env.MP_API_BASE_URL || 'https://api.mercadopago.com';

/** Milliseconds between report-ready checks; tests shorten it. */
export const reportPollMs = () => Number(env.MP_REPORT_POLL_MS) || 15_000;

/** Whole hours between automatic payment syncs: 1 when unset, 0 = off, null when the value is invalid. */
export function syncIntervalHours(): number | null {
	const raw = env.MP_SYNC_INTERVAL_HOURS;
	const hours = raw === undefined || raw === '' ? 1 : Number(raw);
	return Number.isInteger(hours) && hours >= 0 ? hours : null;
}
