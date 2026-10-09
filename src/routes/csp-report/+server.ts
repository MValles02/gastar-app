import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 8 * 1024;
const LOG_MAX_CHARS = 1000;
const REPORT_CONTENT_TYPES = [
	'application/csp-report',
	'application/reports+json',
	'application/json'
];

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
	console.warn(`csp-violation ${JSON.stringify(body.slice(0, LOG_MAX_CHARS))}`);
	return new Response(null, { status: 204 });
};
