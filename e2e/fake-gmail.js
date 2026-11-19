// Tiny fake of Google's OAuth endpoints and the Gmail messages API for the Gmail E2Es.
// /o/oauth2/v2/auth approves at once and redirects back with code and state; the profile it answers for is the
// one set through /__fake/account. Like Google, refresh tokens are not rotated and a revoked one gets
// 400 invalid_grant. The consent answers for `login_hint` when the authorize URL carries one (parallel specs
// link different mailboxes without sharing /__fake/account). Each access token belongs to the mailbox it was
// issued for; GET /gmail/v1/users/me/messages[/:id] serve that mailbox. Control:
// /__fake/{health,reset,revoke,omit-scope,account,requests} and /__fake/alert?email=&last4=&merchant=&amount=
// &currency=&type=&foreign=&dkim=pass|fail[&date=<ISO>][&listed=date] (adds a synthetic Visa alert, dated now or at `date`; the
// listing goes by arrival, so a backdated alert is still listed after the cursor, unless `listed=date`: then it is
// listed at `date`, as real Gmail's `after:` goes by the message date; `network=mastercard[&cuotas=N]` makes it a
// Banco Galicia Mastercard alert instead, `amount` then in es-AR form like "1.234,56"), /__fake/mailbox-reset?email=.
// The global reset leaves mailboxes and access tokens alone, so a spec resetting it does not disturb another.
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
// access token -> mailbox email; email -> messages (oldest first).
const accessTokens = new Map();
const mailboxes = new Map();
let lastDate = 0;
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

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// The alert body Visa sends: one <p> of "Label: value<br>" lines (all values synthetic).
function alertHtml(a) {
	const intro = a.foreign
		? 'Su tarjeta Visa con terminaci&oacute;n ' +
			a.last4 +
			' se acaba de usar en el exterior para la siguiente transacci&oacute;n:'
		: 'Su tarjeta Visa con terminaci&oacute;n ' +
			a.last4 +
			' se acaba de usar para la siguiente transacci&oacute;n:';
	const suffix = a.foreign ? '' : '(puede haber una diferencia en el monto real)';
	return (
		'<html><body><p>' +
		intro +
		'<br><br>' +
		'Comercio: ' +
		escapeHtml(a.merchant) +
		'<br>' +
		'Pa&iacute;s: ' +
		(a.foreign ? 'USA' : 'ARG') +
		'<br>' +
		'Ciudad:  CIUDAD EJEMPLO<br>' +
		'Tarjeta: ' +
		a.last4 +
		'<br>' +
		'Referencia: ' +
		(a.foreign ? 'False' : 'True') +
		'<br>' +
		'Tipo de transacci&oacute;n: ' +
		escapeHtml(a.type) +
		'<br>' +
		'Moneda: ' +
		a.currency +
		'<br>' +
		'Monto: ' +
		a.amount +
		suffix +
		'<br><br>' +
		'Si no reconoce esta transacci&oacute;n, comun&iacute;quese con su banco.</p></body></html>'
	);
}

// The body of a Banco Galicia Mastercard alert (Fiserv): an intro and a list of "Label: <b>value</b>" items.
function mastercardHtml(a) {
	const li = (label, value) =>
		'<li type="disc">&nbsp;' + label + ': <b>' + escapeHtml(value) + '</b></li>';
	return (
		'<html><body><p>Le informamos el movimiento realizado con su Tarjeta Mastercard emitida por ' +
		'<b>BCO DE GALICIA Y BS.AS.</b></p><ul>' +
		li('Tipo de Movimiento', a.type) +
		li('Comercio', a.merchant + '   ') +
		li('Importe', a.amount) +
		li('Moneda', a.currency) +
		li('Fecha', '01/01/2026') +
		li('Hora', '12:00') +
		li('Cantidad cuotas', a.cuotas) +
		li('Estado', 'APROBADA') +
		li('&Uacute;ltimos 4 d&iacute;gitos de la tarjeta', a.last4) +
		li('Ubicaci&oacute;n', a.foreign ? 'Estados Unidos' : 'Argentina') +
		'</ul></body></html>'
	);
}

const SENDERS = {
	visa: {
		from: 'Visa <DoNotReplyAlertadeComprasVisa@visa.com>',
		subject: 'Alerta de Compras Visa',
		auth: (dkim) =>
			'mx.google.com; dkim=' +
			dkim +
			' header.i=@visa.com header.s=cportal; ' +
			'spf=pass smtp.mailfrom=DoNotReplyAlertadeComprasVisa@visa.com; ' +
			'dmarc=pass (p=QUARANTINE) header.from=visa.com'
	},
	mastercard: {
		from: 'Alertas <alertas@misconsultas.com.ar>',
		subject: 'Aviso de consumo con tarjeta',
		auth: (dkim) =>
			'mx.google.com; dkim=' +
			dkim +
			' header.i=@misconsultas.com.ar header.s=fiservser1; ' +
			'spf=pass smtp.mailfrom=alertas@misconsultas.com.ar; ' +
			'dmarc=pass (p=NONE) header.from=misconsultas.com.ar'
	}
};

function gmailMessage(m) {
	const sender = SENDERS[m.network];
	return {
		id: m.id,
		threadId: m.id,
		internalDate: String(m.internalDate),
		payload: {
			mimeType: 'text/html',
			headers: [
				{ name: 'From', value: sender.from },
				{ name: 'Subject', value: sender.subject },
				{ name: 'Date', value: new Date(m.internalDate).toUTCString() },
				{ name: 'Authentication-Results', value: sender.auth(m.dkim) }
			],
			body: { data: Buffer.from(m.html, 'utf8').toString('base64url') }
		}
	};
}

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
	if (path === '/__fake/alert') {
		const q = url.searchParams;
		const to = q.get('email') || DEFAULT_EMAIL;
		lastDate = Math.max(Date.now(), lastDate + 1);
		const id = 'fake-msg-' + ++issued;
		const date = Date.parse(q.get('date') ?? '');
		const network = q.get('network') === 'mastercard' ? 'mastercard' : 'visa';
		const fields = {
			last4: q.get('last4') || '1234',
			merchant: q.get('merchant') || 'COMERCIO EJEMPLO',
			amount: q.get('amount') || '100.00',
			currency: q.get('currency') || 'ARS',
			type: q.get('type') || 'Compra',
			foreign: q.get('foreign') === '1' || q.get('foreign') === 'true',
			cuotas: q.get('cuotas') || '01'
		};
		const html = network === 'mastercard' ? mastercardHtml(fields) : alertHtml(fields);
		const list = mailboxes.get(to) ?? [];
		list.push({
			id,
			network,
			internalDate: Number.isNaN(date) ? lastDate : date,
			listedAt: q.get('listed') === 'date' && !Number.isNaN(date) ? date : lastDate,
			dkim: q.get('dkim') === 'fail' ? 'fail' : 'pass',
			html
		});
		mailboxes.set(to, list);
		return send(res, 200, { id });
	}
	if (path === '/__fake/mailbox-reset') {
		mailboxes.delete(url.searchParams.get('email') || DEFAULT_EMAIL);
		return send(res, 200, { ok: true });
	}
	if (path.startsWith('/gmail/v1/users/me/messages')) {
		const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
		const owner = accessTokens.get(token);
		if (!owner) return send(res, 401, { error: { code: 401, status: 'UNAUTHENTICATED' } });
		const list = mailboxes.get(owner) ?? [];
		if (path === '/gmail/v1/users/me/messages') {
			const after = Number(/after:(\d+)/.exec(url.searchParams.get('q') ?? '')?.[1] ?? 0);
			const messages = list
				.filter((m) => m.listedAt / 1000 > after)
				.map((m) => ({ id: m.id, threadId: m.id }));
			return send(res, 200, { messages, resultSizeEstimate: messages.length });
		}
		const found = list.find((m) => path === '/gmail/v1/users/me/messages/' + m.id);
		return found ? send(res, 200, gmailMessage(found)) : send(res, 404, { error: { code: 404 } });
	}
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
		codes.set(code, {
			email: q.get('login_hint') || email,
			scope: granted,
			challenge: q.get('code_challenge'),
			redirectUri
		});
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
			accessTokens.set(access, entry.email);
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
		refreshTokens.set(refresh, { revoked: false, scope: entry.scope, email: entry.email });
		accessTokens.set(access, entry.email);
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
