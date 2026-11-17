import { createHash, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import * as env from '$app/env/private';
import { canAccessOwn, userOwned } from '../../access';
import { db } from '../../db';
import { account, gmailConnections } from '../../db/schema';
import { decryptToken as decryptWith, encryptToken as encryptWith } from '../token-crypto';
import { gmailApiBaseUrl, gmailAuthBaseUrl } from './env';

const TOKEN_TIMEOUT_MS = 15_000;
const SCOPE_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';

// Gmail has its own Google Cloud client and key: never the sign-in GOOGLE_* client or Better Auth.
export const OAUTH_COOKIE = 'gmail_oauth';
export const OAUTH_PATH = '/profile/gmail';
const CALLBACK_PATH = `${OAUTH_PATH}/callback`;

/** The feature is on only when the client id, client secret and token key are all set. */
export function gmailOauthEnabled(): boolean {
	return !!(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_TOKEN_KEY);
}

// Tokens: AES-256-GCM with GMAIL_TOKEN_KEY (format in ../token-crypto.ts).
const encryptToken = (plain: string, userId: string) =>
	encryptWith(plain, userId, env.GMAIL_TOKEN_KEY);
const decryptToken = (stored: string, userId: string) =>
	decryptWith(stored, userId, env.GMAIL_TOKEN_KEY);

const b64url = (buf: Buffer) => buf.toString('base64url');

const redirectUri = (origin: string) => origin + CALLBACK_PATH;

/** True when the user also signs in with Google (Better Auth `account` row), so the email is a safe hint. */
async function usesGoogleSignIn(userId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: account.id })
		.from(account)
		.where(and(canAccessOwn(userId, account), eq(account.providerId, 'google')))
		.limit(1);
	return !!row;
}

/** New PKCE verifier and CSRF state, plus the authorization URL for them. */
export async function startAuthorization(origin: string, user: { id: string; email: string }) {
	const state = b64url(randomBytes(32));
	const verifier = b64url(randomBytes(32));
	const params = new URLSearchParams({
		client_id: env.GMAIL_CLIENT_ID ?? '',
		response_type: 'code',
		redirect_uri: redirectUri(origin),
		scope: `openid email ${SCOPE_READONLY}`,
		access_type: 'offline',
		// Every link must return a refresh token.
		prompt: 'consent',
		state,
		code_challenge: b64url(createHash('sha256').update(verifier).digest()),
		code_challenge_method: 'S256'
	});
	if (await usesGoogleSignIn(user.id)) params.set('login_hint', user.email);
	return { state, verifier, url: `${gmailAuthBaseUrl()}/o/oauth2/v2/auth?${params}` };
}

type TokenGrant = {
	accessToken: string;
	refreshToken: string | null;
	expiresAt: Date;
	scope: string;
	idToken: string | null;
};

type TokenResult =
	| { ok: true; grant: TokenGrant }
	// 'invalid_grant': Google answered 400 invalid_grant (revoked, expired or reused). 'unavailable': anything else.
	| { ok: false; reason: 'invalid_grant' | 'unavailable' };

async function requestToken(body: Record<string, string>): Promise<TokenResult> {
	let res: Response;
	try {
		res = await fetch(gmailApiBaseUrl() + '/token', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
			body: new URLSearchParams({
				...body,
				client_id: env.GMAIL_CLIENT_ID ?? '',
				client_secret: env.GMAIL_CLIENT_SECRET ?? ''
			}),
			signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS)
		});
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
	try {
		if (res.status === 400) {
			const j = await res.json();
			return { ok: false, reason: j?.error === 'invalid_grant' ? 'invalid_grant' : 'unavailable' };
		}
		if (!res.ok) return { ok: false, reason: 'unavailable' };
		const j = await res.json();
		if (typeof j.access_token !== 'string' || !(Number(j.expires_in) > 0)) {
			return { ok: false, reason: 'unavailable' };
		}
		return {
			ok: true,
			grant: {
				accessToken: j.access_token,
				refreshToken: typeof j.refresh_token === 'string' ? j.refresh_token : null,
				expiresAt: new Date(Date.now() + Number(j.expires_in) * 1000),
				scope: typeof j.scope === 'string' ? j.scope : '',
				idToken: typeof j.id_token === 'string' ? j.id_token : null
			}
		};
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
}

/** Best-effort: tells Google to drop a grant. Never throws. */
async function revokeToken(token: string): Promise<void> {
	try {
		await fetch(gmailApiBaseUrl() + '/revoke', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ token }),
			signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS)
		});
	} catch {
		// Nothing to do: the user can still revoke from their Google account.
	}
}

/** Google account id (`sub`) and email from the id_token payload, or null when malformed. */
function readIdToken(idToken: string): { sub: string; email: string } | null {
	try {
		// No signature check: the token comes straight from Google's token endpoint over TLS.
		const p = JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8'));
		return typeof p.sub === 'string' && p.sub && typeof p.email === 'string' && p.email
			? { sub: p.sub, email: p.email }
			: null;
	} catch {
		return null;
	}
}

/**
 * Exchanges the authorization code and stores the connection (a relink replaces it and clears
 * needs_reconnect). 'scope': the user did not allow reading mail; the grant is revoked and nothing is stored.
 */
export async function exchangeCode(
	userId: string,
	code: string,
	verifier: string,
	origin: string
): Promise<'ok' | 'scope' | 'exchange'> {
	const r = await requestToken({
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri(origin),
		code_verifier: verifier
	});
	if (!r.ok) return 'exchange';
	const { grant } = r;
	const id = grant.idToken ? readIdToken(grant.idToken) : null;
	if (!grant.refreshToken || !id) {
		await revokeToken(grant.refreshToken ?? grant.accessToken);
		return 'exchange';
	}
	if (!grant.scope.split(' ').includes(SCOPE_READONLY)) {
		await revokeToken(grant.refreshToken);
		return 'scope';
	}
	const tokens = {
		googleAccountId: id.sub,
		email: id.email,
		accessToken: encryptToken(grant.accessToken, userId),
		refreshToken: encryptToken(grant.refreshToken, userId),
		expiresAt: grant.expiresAt,
		needsReconnect: false
	};
	await db
		.insert(gmailConnections)
		// The cursor stays null until the first sync, which reads from the "Importar desde" day; a relink keeps it.
		.values({ ...userOwned(userId), ...tokens })
		.onConflictDoUpdate({ target: gmailConnections.userId, set: tokens });
	return 'ok';
}

type RefreshOutcome = 'ok' | 'reconnect' | 'error';

/**
 * Renews the access token. 'reconnect': Google rejected the refresh token (or it cannot be decrypted), so
 * the row now has needs_reconnect=true; 'error' is transient. Updates are conditional on the stored refresh
 * ciphertext, so a concurrent relink is not overwritten. Google does not rotate refresh tokens: the stored
 * one stays unless an answer carries a new one.
 */
export async function refreshConnection(userId: string): Promise<RefreshOutcome> {
	const [conn] = await db
		.select({ refreshToken: gmailConnections.refreshToken })
		.from(gmailConnections)
		.where(canAccessOwn(userId, gmailConnections))
		.limit(1);
	if (!conn) return 'reconnect';
	const unchanged = and(
		canAccessOwn(userId, gmailConnections),
		eq(gmailConnections.refreshToken, conn.refreshToken)
	);
	const reconnect = async (): Promise<RefreshOutcome> => {
		await db.update(gmailConnections).set({ needsReconnect: true }).where(unchanged);
		return 'reconnect';
	};
	let old: string;
	try {
		old = decryptToken(conn.refreshToken, userId);
	} catch {
		return reconnect();
	}
	const r = await requestToken({ grant_type: 'refresh_token', refresh_token: old });
	if (!r.ok) return r.reason === 'invalid_grant' ? reconnect() : 'error';
	const { grant } = r;
	await db
		.update(gmailConnections)
		.set({
			accessToken: encryptToken(grant.accessToken, userId),
			...(grant.refreshToken ? { refreshToken: encryptToken(grant.refreshToken, userId) } : {}),
			expiresAt: grant.expiresAt,
			needsReconnect: false
		})
		.where(unchanged);
	return 'ok';
}

// --- Stored tokens (they never leave this module except through getAccessToken) ---

/**
 * Decrypted access token and expiry for the sync, or null when not linked or the token cannot be decrypted
 * (wrong or rotated GMAIL_TOKEN_KEY, corrupt data): then the connection is flagged needs_reconnect.
 * Never pass the token to a client.
 */
export async function getAccessToken(userId: string) {
	const [row] = await db
		.select({ accessToken: gmailConnections.accessToken, expiresAt: gmailConnections.expiresAt })
		.from(gmailConnections)
		.where(canAccessOwn(userId, gmailConnections))
		.limit(1);
	if (!row) return null;
	try {
		return { token: decryptToken(row.accessToken, userId), expiresAt: row.expiresAt };
	} catch {
		await db
			.update(gmailConnections)
			.set({ needsReconnect: true })
			.where(
				and(
					canAccessOwn(userId, gmailConnections),
					eq(gmailConnections.accessToken, row.accessToken)
				)
			);
		return null;
	}
}

/** The linked address and whether a reconnect is pending, or null when not linked. No token. */
export async function gmailSummary(userId: string) {
	const [row] = await db
		.select({ email: gmailConnections.email, needsReconnect: gmailConnections.needsReconnect })
		.from(gmailConnections)
		.where(canAccessOwn(userId, gmailConnections))
		.limit(1);
	return row ?? null;
}

/** How the user's Gmail connection stands: linked, needing a reconnect, or not linked (null). */
export async function gmailLinkState(userId: string): Promise<'linked' | 'reconnect' | null> {
	const conn = await gmailSummary(userId);
	return conn ? (conn.needsReconnect ? 'reconnect' : 'linked') : null;
}

/** Best-effort revoke of the user's grant at Google. Never throws; the row stays. */
export async function revokeGmail(userId: string): Promise<void> {
	try {
		const [row] = await db
			.select({ refreshToken: gmailConnections.refreshToken })
			.from(gmailConnections)
			.where(canAccessOwn(userId, gmailConnections))
			.limit(1);
		if (row) await revokeToken(decryptToken(row.refreshToken, userId));
	} catch {
		// Undecryptable or DB error: the user can still revoke from their Google account.
	}
}

/** Revokes the grant at Google (best effort), then deletes the connection. */
export async function unlinkGmail(userId: string): Promise<void> {
	await revokeGmail(userId);
	await db.delete(gmailConnections).where(canAccessOwn(userId, gmailConnections));
}
