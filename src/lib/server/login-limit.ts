// ponytail: in-memory, single instance; move to DB/Redis if the app is scaled out
// better-auth's built-in limiter only covers HTTP requests, not direct auth.api calls,
// so the login form action uses this per-IP failed-attempt counter.
const MAX_FAILURES = 5;
const WINDOW_MS = 60_000;
const SWEEP_SIZE = 1000;
const failures = new Map<string, number[]>();

function recent(ip: string, now: number): number[] {
	if (failures.size > SWEEP_SIZE) {
		for (const [key, times] of failures) {
			if (times.every((t) => now - t >= WINDOW_MS)) failures.delete(key);
		}
	}
	const list = (failures.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
	if (list.length) failures.set(ip, list);
	else failures.delete(ip);
	return list;
}

export function isLoginBlocked(ip: string, now = Date.now()): boolean {
	return recent(ip, now).length >= MAX_FAILURES;
}

export function recordLoginFailure(ip: string, now = Date.now()): void {
	failures.set(ip, [...recent(ip, now), now]);
}

/** Test-only: number of tracked keys. */
export function trackedKeys(): number {
	return failures.size;
}
