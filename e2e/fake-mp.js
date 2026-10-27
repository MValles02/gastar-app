// Tiny fake of the Mercado Pago endpoints the import uses, serving synthetic fixtures from e2e/fixtures/mp.
// Records method, path, query and Authorization of every MP call so the E2E can assert them.
// Fixture dates are written `@<days ago>T<hh:mm:ss>` and served as Buenos Aires (-03:00) timestamps,
// so the default 30-day backfill always covers them.
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.FAKE_MP_PORT) || 5199;
const ME = 9000000000;
const DAY_MS = 86_400_000;
const AR_OFFSET_MS = 3 * 3_600_000;
const dir = fileURLToPath(new URL('./fixtures/mp/', import.meta.url));

let requests = [];
let tasks = 0;
let forced = null;
// Milliseconds a settlement report task stays pending, like MP's queue; set through /__fake/report-delay.
let reportDelay = 0;
const taskReadyAt = [];

const send = (res, status, body, type = 'application/json') => {
	res.writeHead(status, { 'content-type': type });
	res.end(typeof body === 'string' ? body : JSON.stringify(body));
};
const relativeDates = (text) =>
	text.replace(/@(\d+)T(\d\d:\d\d:\d\d)/g, (_, days, time) => {
		const day = new Date(Date.now() - AR_OFFSET_MS - Number(days) * DAY_MS)
			.toISOString()
			.slice(0, 10);
		return `${day}T${time}.000-03:00`;
	});
// Callers only pass fixed names or names built from digit-only ids, so nothing from the URL leaves the folder.
const fixture = (name) => {
	const file = dir + name;
	return existsSync(file) ? relativeDates(readFileSync(file, 'utf8')) : null;
};
const readBody = (req) =>
	new Promise((resolve) => {
		let data = '';
		req.on('data', (c) => (data += c));
		req.on('end', () => resolve(data));
	});
const reportFile = (n) => `settlement-report-gastar-${n}.csv`;
const badDate = (res) =>
	send(res, 400, { message: 'Invalid date parameter', error: 'bad_request', cause: [] });

createServer(async (req, res) => {
	const url = new URL(req.url, 'http://x');
	const path = url.pathname;

	if (path === '/__fake/health') return send(res, 200, { ok: true });
	if (path === '/__fake/requests') return send(res, 200, requests);
	if (path === '/__fake/reset' && req.method === 'POST') {
		requests = [];
		tasks = 0;
		forced = null;
		reportDelay = 0;
		taskReadyAt.length = 0;
		return send(res, 200, { ok: true });
	}
	if (path === '/__fake/report-delay' && req.method === 'POST') {
		reportDelay = Number(JSON.parse((await readBody(req)) || '{}').ms) || 0;
		return send(res, 200, { ok: true });
	}
	if (path === '/__fake/status' && req.method === 'POST') {
		forced = JSON.parse((await readBody(req)) || '{}').status ?? null;
		return send(res, 200, { ok: true });
	}

	requests.push({
		method: req.method,
		path,
		query: Object.fromEntries(url.searchParams),
		authorization: req.headers.authorization ?? null
	});
	if (forced) return send(res, forced, { message: 'forced' });

	let m;
	if (path === '/users/me') return send(res, 200, { id: ME });
	if (path === '/v1/payments/search') {
		// Mirrors the real API: ISO dates need milliseconds; range + both dates filter.
		const q = url.searchParams;
		const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(Z|[+-]\d{2}:\d{2})$/;
		if (!iso.test(q.get('begin_date') ?? '') || !iso.test(q.get('end_date') ?? '')) {
			return badDate(res);
		}
		const field = q.get('range') ?? 'date_created';
		const [from, to] = [Date.parse(q.get('begin_date')), Date.parse(q.get('end_date'))];
		const all = JSON.parse(fixture('payments.json'))
			.filter((p) => Date.parse(p[field]) >= from && Date.parse(p[field]) <= to)
			.sort(
				(a, b) => Date.parse(a[q.get('sort') ?? field]) - Date.parse(b[q.get('sort') ?? field])
			);
		if (q.get('criteria') === 'desc') all.reverse();
		const offset = Number(q.get('offset') ?? 0);
		const limit = Number(q.get('limit') ?? 30);
		return send(res, 200, {
			results: all.slice(offset, offset + limit),
			paging: { total: all.length, offset, limit }
		});
	}
	if (path === '/v1/account/settlement_report' && req.method === 'POST') {
		// Mirrors the real API: report dates must be YYYY-MM-DDTHH:MM:SSZ (no milliseconds).
		const body = JSON.parse((await readBody(req)) || '{}');
		const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
		if (!iso.test(body.begin_date) || !iso.test(body.end_date)) return badDate(res);
		tasks++;
		taskReadyAt[tasks] = Date.now() + reportDelay;
		return send(res, 202, { id: tasks, status: 'pending' });
	}
	if ((m = path.match(/^\/v1\/account\/settlement_report\/task\/(\d+)$/))) {
		// Mirrors the real task: status `available` once ready, file under `files`, never a top-level file_name.
		const n = Number(m[1]);
		if (n < 1 || n > tasks) return send(res, 404, { message: 'not_found' });
		const ready = Date.now() >= taskReadyAt[n];
		return send(res, 200, {
			id: n,
			date_start: null,
			date_end: null,
			date_created: new Date().toISOString(),
			created_by: 'api',
			description: null,
			report: 'settlement_report',
			files: ready ? [{ type: 'csv', name: reportFile(n) }] : [],
			event: null,
			structure: null,
			origin: 'api',
			notifiers: [],
			status: ready ? 'available' : 'pending',
			notification_data: null,
			currency_id: 'ARS'
		});
	}
	if (path === '/v1/account/settlement_report/list') {
		// Mirrors the real list: processed entries carry file_name.
		const ready = taskReadyAt.flatMap((at, n) => (n && Date.now() >= at ? [n] : []));
		return send(
			res,
			200,
			ready.map((n) => ({ id: n, status: 'processed', file_name: reportFile(n) }))
		);
	}
	if ((m = path.match(/^\/v1\/account\/settlement_report\/settlement-report-gastar-(\d+)\.csv$/))) {
		const n = Number(m[1]);
		return n >= 1 && n <= tasks
			? send(res, 200, fixture('settlement-report.csv'), 'text/csv')
			: send(res, 404, { message: 'not found' });
	}
	if ((m = path.match(/^\/users\/(\d+)$/))) {
		const f = fixture(`user-${m[1]}.json`);
		return f ? send(res, 200, f) : send(res, 404, { message: 'not found' });
	}
	send(res, 404, { message: 'not found' });
}).listen(PORT, '127.0.0.1');
