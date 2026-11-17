// ponytail: in-memory, single instance; move to DB/Redis if the app is scaled out
// better-auth's built-in limiter only covers HTTP requests, not direct auth.api calls,
// so form actions use these per-bucket counters.
const SWEEP_SIZE = 1000;
const MINUTE_MS = 60_000;

const LIMITS = {
	signIn: { max: 5, windowMs: MINUTE_MS },
	// e2e builds sign up many test users from one IP (matches Better Auth's /sign-up/email rule).
	signUp: { max: import.meta.env.VITE_E2E === '1' ? 50 : 10, windowMs: 60 * MINUTE_MS },
	resetRequestIp: { max: 5, windowMs: 15 * MINUTE_MS },
	resetRequestEmail: { max: 3, windowMs: 15 * MINUTE_MS },
	resend: { max: 5, windowMs: 15 * MINUTE_MS },
	changePassword: { max: 5, windowMs: 15 * MINUTE_MS },
	deleteAccount: { max: 5, windowMs: 15 * MINUTE_MS },
	// Starting a Google sign-in (the form action calls auth.api, which skips Better Auth's limiter).
	// e2e builds start many from one IP.
	oauthStart: { max: import.meta.env.VITE_E2E === '1' ? 50 : 10, windowMs: MINUTE_MS },
	// PDF parsing is the heaviest request a user can send.
	statementUpload: { max: 10, windowMs: 15 * MINUTE_MS }
} as const;

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
