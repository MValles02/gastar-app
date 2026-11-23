import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 8 * 1024;
const LOG_MAX_CHARS = 1000;
const REPORT_CONTENT_TYPES = [
	'application/csp-report',
	'application/reports+json',
	'application/json'
];

const LOG_WINDOW_MS = 10 * 60_000;
const MAX_SEEN = 500;
// (directive, blocked-uri) -> last logged time. Map keeps insertion order, so the first key is the oldest.
const seen = new Map<string, number>();

/** True at most once per key per window; the map is bounded. */
function firstInWindow(key: string): boolean {
	const now = Date.now();
	const last = seen.get(key);
	if (last !== undefined && now - last < LOG_WINDOW_MS) return false;
	seen.delete(key);
	seen.set(key, now);
	if (seen.size > MAX_SEEN) seen.delete(seen.keys().next().value!);
	return true;
}

/** Logs each report of the body (a Reporting API batch has several) once per (directive, blocked-uri) per window. */
function logReports(body: string) {
	let reports: unknown[] = [body];
	try {
		const parsed = JSON.parse(body);
		reports = Array.isArray(parsed) ? parsed : [parsed];
	} catch {
		// unparseable: dedupe on the raw prefix
	}
	for (const report of reports) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const x = report as any;
		const r = x?.body ?? x?.['csp-report'] ?? {};
		const key =
			typeof report === 'string'
				? report.slice(0, 200)
				: `${r.effectiveDirective ?? r['effective-directive'] ?? r['violated-directive']}|${r.blockedURL ?? r['blocked-uri']}`;
		const text = typeof report === 'string' ? report : JSON.stringify(report);
		if (firstInWindow(key))
			console.warn(`csp-violation ${JSON.stringify(text.slice(0, LOG_MAX_CHARS))}`);
	}
}

export const POST: RequestHandler = async ({ request }) => {
	const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
	const length = Number(request.headers.get('content-length') ?? 0);
	if (!REPORT_CONTENT_TYPES.includes(type) || !(length <= MAX_BODY_BYTES))
		return new Response(null, { status: 204 });
	let body = '';
	try {
		body = (await request.text()).slice(0, MAX_BODY_BYTES);
	} catch {
		// ignore unreadable bodies
	}
	logReports(body);
	return new Response(null, { status: 204 });
};
