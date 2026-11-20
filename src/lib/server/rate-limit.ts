// ponytail: in-memory, single instance; move to DB/Redis if the app is scaled out
// better-auth's built-in limiter only covers HTTP requests, not direct auth.api calls,
// so form actions use these per-bucket counters.
import { e2eOr } from '#lib/e2e.ts';

const SWEEP_SIZE = 1000;
const MINUTE_MS = 60_000;

// Better Auth's limiter covers the HTTP endpoints (keyed by IP + path); the form-action buckets
// cover direct auth.api calls. They are separate counters, so their numbers are independent
// (e.g. `resend` vs `resendHttp`).
export const LIMITS = {
	signIn: { max: 5, windowMs: MINUTE_MS },
	// e2e builds sign up many test users from one IP (matches Better Auth's /sign-up/email rule).
	signUp: { max: e2eOr(10), windowMs: 60 * MINUTE_MS },
	resetRequestIp: { max: 5, windowMs: 15 * MINUTE_MS },
	resetRequestEmail: { max: 3, windowMs: 15 * MINUTE_MS },
	resend: { max: 5, windowMs: 15 * MINUTE_MS },
	// Better Auth HTTP endpoints (see above).
	resendHttp: { max: 3, windowMs: 15 * MINUTE_MS },
	resetRequestHttp: { max: 3, windowMs: 15 * MINUTE_MS },
	verifyEmail: { max: e2eOr(10), windowMs: MINUTE_MS },
	oauthCallback: { max: e2eOr(10), windowMs: MINUTE_MS },
	changePassword: { max: 5, windowMs: 15 * MINUTE_MS },
	deleteAccount: { max: 5, windowMs: 15 * MINUTE_MS },
	// Starting a Google sign-in (the form action calls auth.api, which skips Better Auth's limiter).
	// e2e builds start many from one IP.
	oauthStart: { max: e2eOr(10), windowMs: MINUTE_MS },
	// PDF parsing is the heaviest request a user can send.
	statementUpload: { max: e2eOr(10), windowMs: 15 * MINUTE_MS }
} as const;

/** Better Auth takes the window in seconds. */
const rule = ({ max, windowMs }: { max: number; windowMs: number }) => ({
	window: windowMs / 1000,
	max
});

/** Better Auth's `rateLimit.customRules`: its HTTP endpoints, on the Better Auth buckets above. */
export const BETTER_AUTH_RULES = {
	'/sign-in/email': rule(LIMITS.signIn),
	'/send-verification-email': rule(LIMITS.resendHttp),
	'/request-password-reset': rule(LIMITS.resetRequestHttp),
	'/sign-up/email': rule(LIMITS.signUp),
	'/verify-email': rule(LIMITS.verifyEmail),
	'/sign-in/social': rule(LIMITS.oauthStart),
	'/callback/*': rule(LIMITS.oauthCallback)
};

/** A key idle for the longest window holds no hits that count in any bucket. */
const MAX_WINDOW_MS = Math.max(...Object.values(LIMITS).map((limit) => limit.windowMs));

type Bucket = keyof typeof LIMITS;

const hits = new Map<string, number[]>();

function sweepStale(now: number): void {
	for (const [id, times] of hits) {
		if (times.every((t) => now - t >= MAX_WINDOW_MS)) hits.delete(id);
	}
}

function recent(bucket: Bucket, key: string, now: number): number[] {
	if (hits.size > SWEEP_SIZE) sweepStale(now);
	const id = `${bucket}:${key}`;
	const list = (hits.get(id) ?? []).filter((t) => now - t < LIMITS[bucket].windowMs);
	if (list.length) hits.set(id, list);
	else hits.delete(id);
	return list;
}

export function isBlocked(bucket: Bucket, key: string, now = Date.now()): boolean {
	return recent(bucket, key, now).length >= LIMITS[bucket].max;
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
