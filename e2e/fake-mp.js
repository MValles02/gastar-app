// Tiny fake of the Mercado Pago endpoints the import uses, serving synthetic fixtures from e2e/fixtures/mp.
// Records method, path (no query) and Authorization of every MP call so the E2E can assert the Bearer header.
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.FAKE_MP_PORT) || 5199;
const ME = 9000000000;
const dir = fileURLToPath(new URL('./fixtures/mp/', import.meta.url));

let requests = [];
let files = [];
let forced = null;

const send = (res, status, body, type = 'application/json') => {
	res.writeHead(status, { 'content-type': type });
	res.end(typeof body === 'string' ? body : JSON.stringify(body));
};
// Callers only pass names built from digit-only ids, so nothing from the URL can leave the fixtures folder.
const fixture = (name) => {
	const file = dir + name;
	return existsSync(file) ? readFileSync(file, 'utf8') : null;
};
const readBody = (req) =>
	new Promise((resolve) => {
		let data = '';
		req.on('data', (c) => (data += c));
		req.on('end', () => resolve(data));
	});

createServer(async (req, res) => {
	const path = new URL(req.url, 'http://x').pathname;

	if (path === '/__fake/health') return send(res, 200, { ok: true });
	if (path === '/__fake/requests') return send(res, 200, requests);
	if (path === '/__fake/reset' && req.method === 'POST') {
		requests = [];
		files = [];
		forced = null;
		return send(res, 200, { ok: true });
	}
	if (path === '/__fake/status' && req.method === 'POST') {
		forced = JSON.parse((await readBody(req)) || '{}').status ?? null;
		return send(res, 200, { ok: true });
	}

	requests.push({ method: req.method, path, authorization: req.headers.authorization ?? null });
	if (forced) return send(res, forced, { message: 'forced' });

	let m;
	if (path === '/users/me') return send(res, 200, { id: ME });
	if (path === '/v1/account/release_report/list') return send(res, 200, files);
	if (path === '/v1/account/release_report' && req.method === 'POST') {
		const n = files.length + 1;
		files.push({
			id: n,
			file_name: `release-report-${n}.csv`,
			date_created: new Date().toISOString()
		});
		return send(res, 202, { id: n });
	}
	if ((m = path.match(/^\/v1\/account\/release_report\/(release-report-\d+\.csv)$/))) {
		return files.some((f) => f.file_name === m[1])
			? send(res, 200, fixture('release-report.csv'), 'text/csv')
			: send(res, 404, { message: 'not found' });
	}
	if ((m = path.match(/^\/v1\/payments\/(\d+)$/))) {
		const f = fixture(`payment-${m[1]}.json`);
		return f ? send(res, 200, f) : send(res, 404, { message: 'not found' });
	}
	if ((m = path.match(/^\/users\/(\d+)$/))) {
		const f = fixture(`user-${m[1]}.json`);
		return f ? send(res, 200, f) : send(res, 404, { message: 'not found' });
	}
	send(res, 404, { message: 'not found' });
}).listen(PORT, '127.0.0.1');
