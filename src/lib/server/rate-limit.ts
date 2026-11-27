// ponytail: in-memory, single instance; move to DB/Redis if the app is scaled out
// better-auth's built-in limiter only covers HTTP requests, not direct auth.api calls,
// so form actions use these per-bucket counters.
import { RATE_LIMITS } from '#lib/server/constants.ts';

const SWEEP_SIZE = 1000;

/** Better Auth takes the window in seconds. */
const rule = ({ max, windowMs }: { max: number; windowMs: number }) => ({
	window: windowMs / 1000,
	max
});

/** Better Auth's `rateLimit.customRules`: its HTTP endpoints, on the Better Auth buckets above. */
export const BETTER_AUTH_RULES = {
	'/sign-in/email': rule(RATE_LIMITS.signIn),
	'/send-verification-email': rule(RATE_LIMITS.resendHttp),
	'/request-password-reset': rule(RATE_LIMITS.resetRequestHttp),
	'/sign-up/email': rule(RATE_LIMITS.signUp),
	'/verify-email': rule(RATE_LIMITS.verifyEmail),
	'/sign-in/social': rule(RATE_LIMITS.oauthStart),
	'/callback/*': rule(RATE_LIMITS.oauthCallback)
};

/** A key idle for the longest window holds no hits that count in any bucket. */
const MAX_WINDOW_MS = Math.max(...Object.values(RATE_LIMITS).map((limit) => limit.windowMs));

type Bucket = keyof typeof RATE_LIMITS;

const hits = new Map<string, number[]>();

function sweepStale(now: number): void {
	for (const [id, times] of hits) {
		if (times.every((t) => now - t >= MAX_WINDOW_MS)) hits.delete(id);
	}
}

function recent(bucket: Bucket, key: string, now: number): number[] {
	if (hits.size > SWEEP_SIZE) sweepStale(now);
	const id = `${bucket}:${key}`;
	const list = (hits.get(id) ?? []).filter((t) => now - t < RATE_LIMITS[bucket].windowMs);
	if (list.length) hits.set(id, list);
	else hits.delete(id);
	return list;
}

export function isBlocked(bucket: Bucket, key: string, now = Date.now()): boolean {
	return recent(bucket, key, now).length >= RATE_LIMITS[bucket].max;
}

export function record(bucket: Bucket, key: string, now = Date.now()): void {
	hits.set(`${bucket}:${key}`, [...recent(bucket, key, now), now]);
}

/**
 * Policies in this app:
 * (a) count every attempt: `rateLimited`.
 * (b) count only failures (login, change password, delete account; a wrong password counts, success
 *     does not): `isBlocked` up front, `record` on failure.
 * (c) count attempts that pass validation (sign-up, statement upload): `isBlocked` up front,
 *     `record` after validation.
 * (d) forgot-password: check both buckets, then record both even when blocked.
 */

/** Policy (a): true if blocked, otherwise records one hit and returns false. */
export function rateLimited(bucket: Bucket, key: string, now = Date.now()): boolean {
	if (isBlocked(bucket, key, now)) return true;
	record(bucket, key, now);
	return false;
}
