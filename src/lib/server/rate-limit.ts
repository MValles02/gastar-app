// ponytail: in-memory, single instance; move to DB/Redis if the app is scaled out
// better-auth's built-in limiter only covers HTTP requests, not direct auth.api calls,
// so form actions use these per-bucket counters.
const SWEEP_SIZE = 1000;
const MIN = 60_000;

const LIMITS = {
	signIn: { max: 5, windowMs: MIN },
	signUp: { max: 10, windowMs: 60 * MIN },
	resetRequestIp: { max: 5, windowMs: 15 * MIN },
	resetRequestEmail: { max: 3, windowMs: 15 * MIN },
	resend: { max: 5, windowMs: 15 * MIN }
} as const;

export type Bucket = keyof typeof LIMITS;

const hits = new Map<string, number[]>();

function recent(bucket: Bucket, key: string, now: number): number[] {
	const { windowMs } = LIMITS[bucket];
	if (hits.size > SWEEP_SIZE) {
		const maxWindow = 60 * MIN;
		for (const [k, times] of hits) {
			if (times.every((t) => now - t >= maxWindow)) hits.delete(k);
		}
	}
	const id = `${bucket}:${key}`;
	const list = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
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
