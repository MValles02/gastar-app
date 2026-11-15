// Tiny fake of the Mercado Pago endpoints the import uses, serving synthetic fixtures from e2e/fixtures/mp.
// Records method, path, query and Authorization of every MP call so the E2E can assert them.
// Fixture dates are written `@<days ago>T<hh:mm:ss>` and served as Buenos Aires (-03:00) timestamps,
// so the default 30-day backfill always covers them.
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.FAKE_MP_PORT) || 5199;
const ME = 9000000000;
const CLIENT_ID = process.env.FAKE_MP_CLIENT_ID || 'test-client-id';
const CLIENT_SECRET = process.env.FAKE_MP_CLIENT_SECRET || 'test-client-secret';
const DAY_MS = 86_400_000;
const AR_OFFSET_MS = 3 * 3_600_000;
const dir = fileURLToPath(new URL('./fixtures/mp/', import.meta.url));

let requests = [];
let tasks = 0;
let forced = null;
// Milliseconds a release report task stays pending, like MP's queue; set through /__fake/report-delay.
let reportDelay = 0;
const taskReadyAt = [];

// OAuth state. Only the latest refresh token is valid (MP rotates it on every refresh).
let codes = new Map();
let liveTokens = new Set();
let latestRefresh = null;
let issued = 0;
let deny = false;
let revoked = false;
// Makes /oauth/token answer 500, like Mercado Pago being down.
let tokenFails = false;
// Release report config per OAuth grant (one per linked MP account). New grants start configured, with an
// owner email, one column of their own and translated headers, unless /__fake/report-config says
// otherwise. Config POST and PUT bodies are kept for the E2E to assert.
let grantSeq = 0;
let currentGrant = 0;
const tokenGrant = new Map();
const grantConfig = new Map();
let newGrantsConfigured = true;
let configPosts = [];
let configPuts = [];
// begin_date of every release report created, oldest first; read through /__fake/report-begins.
let reportBegins = [];
// Body of every release report create attempt (rejected ones included), oldest first.
let reportCreates = [];
// The writable release report config fields per MP's docs; a PUT with any other key answers 400.
const WRITABLE_CONFIG_KEYS = [
	'columns',
	'file_name_prefix',
	'frequency',
	'sftp_info',
	'separator',
	'display_timezone',
	'report_translation',
	'notification_email_list',
	'include_withdrawal_at_end',
	'execute_after_withdrawal',
	'check_available_balance',
	'compensate_detail'
];
const b64url = (buf) => Buffer.from(buf).toString('base64url');

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
const reportFile = (n) => `gastar-release-${n}.csv`;
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
		codes = new Map();
		liveTokens = new Set();
		latestRefresh = null;
		issued = 0;
		deny = false;
		revoked = false;
		tokenFails = false;
		grantSeq = 0;
		currentGrant = 0;
		tokenGrant.clear();
		grantConfig.clear();
		newGrantsConfigured = true;
		configPosts = [];
		configPuts = [];
		reportBegins = [];
		reportCreates = [];
		return send(res, 200, { ok: true });
	}
	if (path === '/__fake/report-begins') return send(res, 200, reportBegins);
	if (path === '/__fake/report-creates') return send(res, 200, reportCreates);
	if (path === '/__fake/report-config' && req.method === 'POST') {
		const b = JSON.parse((await readBody(req)) || '{}');
		newGrantsConfigured = b.configured ?? true;
		return send(res, 200, { ok: true });
	}
	if (path === '/__fake/report-config') return send(res, 200, configPosts);
	if (path === '/__fake/report-config-puts') return send(res, 200, configPuts);
	if (path === '/__fake/report-delay' && req.method === 'POST') {
		reportDelay = Number(JSON.parse((await readBody(req)) || '{}').ms) || 0;
		return send(res, 200, { ok: true });
	}
	if (path === '/__fake/status' && req.method === 'POST') {
		forced = JSON.parse((await readBody(req)) || '{}').status ?? null;
		return send(res, 200, { ok: true });
	}

	if (path === '/__fake/oauth' && req.method === 'POST') {
		deny = !!JSON.parse((await readBody(req)) || '{}').deny;
		return send(res, 200, { ok: true });
	}
	// The current access token stops working; the refresh token still works.
	if (path === '/__fake/expire' && req.method === 'POST') {
		liveTokens.clear();
		return send(res, 200, { ok: true });
	}
	// Refreshing fails from now on, like a user who revoked access in Mercado Pago.
	if (path === '/__fake/revoke' && req.method === 'POST') {
		revoked = true;
		liveTokens.clear();
		return send(res, 200, { ok: true });
	}
	if (path === '/authorization') {
		const q = url.searchParams;
		const back = new URL(q.get('redirect_uri') || '');
		if (q.get('state')) back.searchParams.set('state', q.get('state'));
		if (deny) back.searchParams.set('error', 'access_denied');
		else {
			const code = `TG-${++issued}`;
			codes.set(code, {
				challenge: q.get('code_challenge'),
				method: q.get('code_challenge_method'),
				redirectUri: q.get('redirect_uri')
			});
			back.searchParams.set('code', code);
		}
		res.writeHead(302, { location: back.toString() });
		return res.end();
	}
	if (path === '/__fake/token-fail' && req.method === 'POST') {
		tokenFails = !!JSON.parse((await readBody(req)) || '{}').fail;
		return send(res, 200, { ok: true });
	}
	if (path === '/oauth/token' && req.method === 'POST') {
		if (tokenFails) return send(res, 500, { message: 'down' });
		const body = JSON.parse((await readBody(req)) || '{}');
		const bad = (error) => send(res, 400, { error, message: error, status: 400 });
		if (body.client_id !== CLIENT_ID || body.client_secret !== CLIENT_SECRET) {
			return bad('invalid_client');
		}
		if (body.grant_type === 'authorization_code') {
			const entry = codes.get(body.code);
			codes.delete(body.code); // single use
			if (!entry || entry.redirectUri !== body.redirect_uri) return bad('invalid_grant');
			const hash = b64url(
				createHash('sha256')
					.update(String(body.code_verifier || ''))
					.digest()
			);
			if (entry.method !== 'S256' || hash !== entry.challenge) return bad('invalid_grant');
			currentGrant = ++grantSeq;
			grantConfig.set(
				currentGrant,
				newGrantsConfigured
					? {
							// `scheduled` is read-only and `internal_id` undocumented: a PUT must not send them back.
							scheduled: false,
							internal_id: 'abc123',
							file_name_prefix: 'user-prefix',
							separator: ';',
							notification_email_list: ['owner@example.com'],
							columns: [{ key: 'DATE' }, { key: 'USER_COLUMN' }],
							report_translation: 'es'
						}
					: null
			);
		} else if (body.grant_type === 'refresh_token') {
			if (revoked || !latestRefresh || body.refresh_token !== latestRefresh) {
				return bad('invalid_grant');
			}
		} else return bad('unsupported_grant_type');
		const n = ++issued;
		const access = `APP_USR-fake-${n}`;
		latestRefresh = `TG-refresh-${n}`;
		liveTokens.add(access);
		tokenGrant.set(access, currentGrant);
		return send(res, 200, {
			access_token: access,
			token_type: 'Bearer',
			expires_in: 15_552_000,
			scope: 'offline_access read write',
			user_id: ME,
			refresh_token: latestRefresh
		});
	}

	requests.push({
		method: req.method,
		path,
		query: Object.fromEntries(url.searchParams),
		authorization: req.headers.authorization ?? null
	});
	const bearer = (req.headers.authorization || '').replace(/^Bearer /, '');
	if (!liveTokens.has(bearer)) return send(res, 401, { message: 'invalid_token', status: 401 });
	if (forced) return send(res, forced, { message: 'forced' });

	const grant = tokenGrant.get(bearer);
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
	// Real MP answers 404 on the config GET and on the report create until the account has a release config.
	if (path === '/v1/account/release_report/config') {
		if (req.method === 'POST') {
			const config = JSON.parse((await readBody(req)) || '{}');
			configPosts.push(config);
			// Real MP rejects a create without a boolean execute_after_withdrawal.
			if (typeof config.execute_after_withdrawal !== 'boolean')
				return send(res, 400, { message: 'Invalid execute_after_withdrawal' });
			grantConfig.set(grant, config);
			return send(res, 201, config);
		}
		if (req.method === 'PUT' && grantConfig.get(grant)) {
			const config = JSON.parse((await readBody(req)) || '{}');
			configPuts.push(config);
			if (Object.keys(config).some((k) => !WRITABLE_CONFIG_KEYS.includes(k)))
				return send(res, 400, { message: 'read-only or unknown field in config' });
			grantConfig.set(grant, config);
			return send(res, 200, config);
		}
		if (req.method === 'GET' && grantConfig.get(grant)) {
			return send(res, 200, grantConfig.get(grant));
		}
		return send(res, 404, { message: 'not_found' });
	}
	if (path === '/v1/account/release_report' && req.method === 'POST') {
		if (!grantConfig.get(grant)) return send(res, 404, { message: 'not_found' });
		// Mirrors the real API: report dates must be YYYY-MM-DDTHH:MM:SSZ (no milliseconds).
		const body = JSON.parse((await readBody(req)) || '{}');
		const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
		if (!iso.test(body.begin_date) || !iso.test(body.end_date)) return badDate(res);
		reportCreates.push(body);
		reportBegins.push(body.begin_date);
		tasks++;
		taskReadyAt[tasks] = Date.now() + reportDelay;
		return send(res, 202, {
			id: tasks,
			status: 'pending',
			internal_management: [{ is_visible: true, notify: true, use_exact_time: true }]
		});
	}
	if ((m = path.match(/^\/v1\/account\/release_report\/task\/(\d+)$/))) {
		// Mirrors the documented task: `file_name` is null until the status is `processed`.
		const n = Number(m[1]);
		if (n < 1 || n > tasks) return send(res, 404, { message: 'not_found' });
		const ready = Date.now() >= taskReadyAt[n];
		const now = new Date().toISOString();
		return send(res, 200, {
			id: n,
			user_id: ME,
			begin_date: now,
			end_date: now,
			created_from: 'manual',
			is_test: false,
			is_reserve: false,
			status: ready ? 'processed' : 'processing',
			report_type: 'release',
			generation_date: now,
			report_id: ready ? 1000 + n : null,
			last_modified: now,
			retries: 0,
			sub_type: 'release',
			account_id: ME,
			currency_id: 'ARS',
			format: 'CSV',
			file_name: ready ? reportFile(n) : null
		});
	}
	if ((m = path.match(/^\/v1\/account\/release_report\/gastar-release-(\d+)\.csv$/))) {
		const n = Number(m[1]);
		return n >= 1 && n <= tasks
			? send(res, 200, fixture('release-report.csv'), 'text/csv')
			: send(res, 404, { message: 'not found' });
	}
	if ((m = path.match(/^\/users\/(\d+)$/))) {
		const f = fixture(`user-${m[1]}.json`);
		return f ? send(res, 200, f) : send(res, 404, { message: 'not found' });
	}
	send(res, 404, { message: 'not found' });
}).listen(PORT, '127.0.0.1');
