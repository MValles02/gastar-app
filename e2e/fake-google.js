// Tiny fake of Google's OpenID Connect endpoints for the "Continuar con Google" E2E.
// /authorize renders a form where the test picks the profile (email, name, email_verified), so
// parallel specs never share state; /token verifies the PKCE challenge and answers a signed id_token.
import { createHash, createSign, generateKeyPairSync } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_GOOGLE_PORT) || 5198;
const ISSUER = `http://127.0.0.1:${PORT}`;
const CLIENT_ID = process.env.FAKE_GOOGLE_CLIENT_ID || 'test-google-client-id';
const CLIENT_SECRET = process.env.FAKE_GOOGLE_CLIENT_SECRET || 'test-google-client-secret';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = {
	...publicKey.export({ format: 'jwk' }),
	kid: 'fake-google',
	alg: 'RS256',
	use: 'sig'
};

// code -> { profile, challenge, redirectUri, nonce }; access token -> profile.
const codes = new Map();
const tokens = new Map();
let issued = 0;

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sub = (email) => createHash('sha256').update(email).digest('hex').slice(0, 21);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
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
const redirect = (res, location) => {
	res.writeHead(302, { location });
	res.end();
};

function idToken(profile, nonce) {
	const now = Math.floor(Date.now() / 1000);
	const payload = {
		iss: ISSUER,
		aud: CLIENT_ID,
		sub: sub(profile.email),
		email: profile.email,
		email_verified: profile.emailVerified,
		name: profile.name,
		...(nonce ? { nonce } : {}),
		iat: now,
		exp: now + 3600
	};
	const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: jwk.kid }));
	const signing = `${head}.${b64url(JSON.stringify(payload))}`;
	const signature = createSign('RSA-SHA256').update(signing).sign(privateKey);
	return `${signing}.${b64url(signature)}`;
}

createServer(async (req, res) => {
	const url = new URL(req.url, ISSUER);
	const path = url.pathname;

	if (path === '/__fake/health') return send(res, 200, { ok: true });
	if (path === '/.well-known/openid-configuration') {
		return send(res, 200, {
			issuer: ISSUER,
			authorization_endpoint: `${ISSUER}/authorize`,
			token_endpoint: `${ISSUER}/token`,
			userinfo_endpoint: `${ISSUER}/userinfo`,
			jwks_uri: `${ISSUER}/jwks`,
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code'],
			subject_types_supported: ['public'],
			id_token_signing_alg_values_supported: ['RS256'],
			code_challenge_methods_supported: ['S256']
		});
	}
	if (path === '/jwks') return send(res, 200, { keys: [jwk] });

	if (path === '/authorize') {
		const q = url.searchParams;
		const redirectUri = q.get('redirect_uri');
		if (q.get('client_id') !== CLIENT_ID || !redirectUri) {
			return send(res, 400, 'invalid client_id or redirect_uri', 'text/plain');
		}
		if (req.method === 'POST') {
			const form = new URLSearchParams(await readBody(req));
			const back = new URL(redirectUri);
			if (q.get('state')) back.searchParams.set('state', q.get('state'));
			if (form.get('action') === 'cancel') {
				back.searchParams.set('error', 'access_denied');
				return redirect(res, back.toString());
			}
			const code = `fake-code-${++issued}`;
			codes.set(code, {
				profile: {
					email: form.get('email') ?? '',
					name: form.get('name') ?? '',
					emailVerified: form.get('email_verified') === 'on'
				},
				challenge: q.get('code_challenge'),
				redirectUri,
				nonce: q.get('nonce')
			});
			back.searchParams.set('code', code);
			return redirect(res, back.toString());
		}
		// The form posts back to this same URL, so the OAuth parameters stay in the query.
		return send(
			res,
			200,
			`<!doctype html><meta charset="utf-8"><title>Fake Google</title>
<form method="POST" action="${escapeHtml(url.pathname + url.search)}">
<label>Email <input name="email" type="email"></label>
<label>Name <input name="name"></label>
<label><input name="email_verified" type="checkbox" checked> Email verified</label>
<button type="submit" name="action" value="continue">Continuar</button>
<button type="submit" name="action" value="cancel">Cancelar</button>
</form>`,
			'text/html'
		);
	}

	if (path === '/token' && req.method === 'POST') {
		const form = new URLSearchParams(await readBody(req));
		const bad = (error) => send(res, 400, { error });
		const basic = (req.headers.authorization || '').match(/^Basic (.+)$/);
		const [id, secret] = basic
			? Buffer.from(basic[1], 'base64').toString().split(':').map(decodeURIComponent)
			: [form.get('client_id'), form.get('client_secret')];
		if (id !== CLIENT_ID || secret !== CLIENT_SECRET) return bad('invalid_client');
		const entry = codes.get(form.get('code'));
		codes.delete(form.get('code')); // single use
		if (!entry || entry.redirectUri !== form.get('redirect_uri')) return bad('invalid_grant');
		const hash = b64url(
			createHash('sha256')
				.update(form.get('code_verifier') ?? '')
				.digest()
		);
		if (hash !== entry.challenge) return bad('invalid_grant');
		const access = `fake-access-${++issued}`;
		tokens.set(access, entry.profile);
		return send(res, 200, {
			access_token: access,
			token_type: 'Bearer',
			expires_in: 3600,
			scope: 'openid email profile',
			id_token: idToken(entry.profile, entry.nonce)
		});
	}

	if (path === '/userinfo') {
		const profile = tokens.get((req.headers.authorization || '').replace(/^Bearer /, ''));
		if (!profile) return send(res, 401, { error: 'invalid_token' });
		return send(res, 200, {
			sub: sub(profile.email),
			email: profile.email,
			email_verified: profile.emailVerified,
			name: profile.name,
			picture: 'https://example.invalid/picture.png'
		});
	}

	send(res, 404, { error: 'not_found' });
}).listen(PORT, '127.0.0.1');
