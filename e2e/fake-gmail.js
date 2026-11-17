// Tiny fake of Google's OAuth endpoints for the "Vincular Gmail" E2E (the Gmail API itself is not faked yet).
// /o/oauth2/v2/auth approves at once and redirects back with code and state; the profile it answers for is the
// one set through /__fake/account. Like Google, refresh tokens are not rotated and a revoked one gets
// 400 invalid_grant. Control: /__fake/{health,reset,revoke,omit-scope,account,requests}.
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_GMAIL_PORT) || 5197;
const CLIENT_ID = process.env.FAKE_GMAIL_CLIENT_ID || 'test-gmail-client-id';
const CLIENT_SECRET = process.env.FAKE_GMAIL_CLIENT_SECRET || 'test-gmail-client-secret';
const READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
const DEFAULT_EMAIL = 'gmail-e2e@gastar.local';

// code -> { email, scope, challenge, redirectUri }; refresh token -> { revoked }.
let codes = new Map();
let refreshTokens = new Map();
let requests = [];
let issued = 0;
let omitScope = false;
let email = DEFAULT_EMAIL;

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const send = (res, status, body, type = 'application/json') => {
	res.writeHead(status, { 'content-type': type });
	res.end(typeof body === 'string' ? body : JSON.stringify(body));
};
const readBody = (req) =>
	new Promise((resolve) => {
		let data = '';
		req.on('data', (c) => (data += c));
		req.on('end', () => resolve(data));
	});
const reset = () => {
	codes = new Map();
	refreshTokens = new Map();
	requests = [];
	omitScope = false;
	email = DEFAULT_EMAIL;
};

// Unsigned JWT: the app reads sub and email without checking a signature.
const idToken = (address) =>
	[
		b64url(JSON.stringify({ alg: 'none', typ: 'JWT' })),
		b64url(
			JSON.stringify({
				iss: 'https://accounts.google.com',
				aud: CLIENT_ID,
				sub: createHash('sha256').update(address).digest('hex').slice(0, 21),
				email: address,
				email_verified: true
			})
		),
		''
	].join('.');

createServer(async (req, res) => {
	const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
	const path = url.pathname;
	if (path === '/__fake/health') return send(res, 200, { ok: true });
	if (path === '/__fake/reset') {
		reset();
		return send(res, 200, { ok: true });
	}
	if (path === '/__fake/requests') return send(res, 200, requests);
	if (path === '/__fake/omit-scope') {
		omitScope = true; // the next consent leaves gmail.readonly out of the granted scope
		return send(res, 200, { ok: true });
	}
	if (path === '/__fake/account') {
		email = url.searchParams.get('email') || DEFAULT_EMAIL;
		return send(res, 200, { ok: true });
	}
	if (path === '/__fake/revoke') {
		for (const entry of refreshTokens.values()) entry.revoked = true;
		return send(res, 200, { ok: true });
	}

	if (path === '/o/oauth2/v2/auth') {
		const q = url.searchParams;
		const redirectUri = q.get('redirect_uri');
		const scope = q.get('scope') ?? '';
		if (
			q.get('client_id') !== CLIENT_ID ||
			!redirectUri ||
			q.get('response_type') !== 'code' ||
			q.get('access_type') !== 'offline' ||
			q.get('prompt') !== 'consent' ||
			q.get('code_challenge_method') !== 'S256' ||
			!q.get('code_challenge') ||
			!scope.split(' ').includes(READONLY)
		) {
			return send(res, 400, 'invalid authorization request', 'text/plain');
		}
		const granted = omitScope ? 'openid email' : scope;
		omitScope = false;
		const code = `fake-gmail-code-${++issued}`;
		codes.set(code, { email, scope: granted, challenge: q.get('code_challenge'), redirectUri });
		const back = new URL(redirectUri);
		back.searchParams.set('code', code);
		if (q.get('state')) back.searchParams.set('state', q.get('state'));
		res.writeHead(302, { location: back.toString() });
		return res.end();
	}

	if (path === '/token' && req.method === 'POST') {
		const form = new URLSearchParams(await readBody(req));
		const bad = (error) => send(res, 400, { error });
		if (form.get('client_id') !== CLIENT_ID || form.get('client_secret') !== CLIENT_SECRET) {
			return send(res, 401, { error: 'invalid_client' });
		}
		const access = `fake-gmail-access-${++issued}`;
		if (form.get('grant_type') === 'refresh_token') {
			const entry = refreshTokens.get(form.get('refresh_token'));
			if (!entry || entry.revoked) return bad('invalid_grant');
			return send(res, 200, {
				access_token: access,
				token_type: 'Bearer',
				expires_in: 3599,
				scope: entry.scope
			});
		}
		if (form.get('grant_type') !== 'authorization_code') return bad('unsupported_grant_type');
		const entry = codes.get(form.get('code'));
		codes.delete(form.get('code')); // single use
		if (!entry || entry.redirectUri !== form.get('redirect_uri')) return bad('invalid_grant');
		const hash = b64url(
			createHash('sha256')
				.update(form.get('code_verifier') ?? '')
				.digest()
		);
		if (hash !== entry.challenge) return bad('invalid_grant');
		const refresh = `fake-gmail-refresh-${++issued}`;
		refreshTokens.set(refresh, { revoked: false, scope: entry.scope });
		return send(res, 200, {
			access_token: access,
			refresh_token: refresh,
			token_type: 'Bearer',
			expires_in: 3599,
			scope: entry.scope,
			id_token: idToken(entry.email)
		});
	}

	if (path === '/revoke' && req.method === 'POST') {
		const token = new URLSearchParams(await readBody(req)).get('token') ?? '';
		requests.push({ method: req.method, path, token });
		const entry = refreshTokens.get(token);
		if (entry) entry.revoked = true;
		return send(res, entry ? 200 : 400, entry ? {} : { error: 'invalid_token' });
	}

	send(res, 404, { error: 'not_found' });
}).listen(PORT, '127.0.0.1');
