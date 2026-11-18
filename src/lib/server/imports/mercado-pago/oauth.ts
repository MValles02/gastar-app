import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import * as env from '$app/env/private';
import { canAccessOwn, userOwned } from '../../access';
import { db } from '../../db';
import { mpConnections, mpSyncState } from '../../db/schema';
import { callbackUrl, type OAuthLink, pkce } from '../oauth-link';
import { decryptToken as decryptWith, encryptToken as encryptWith } from '../token-crypto';
import { mpApiBaseUrl } from './env';

const DEFAULT_AUTH_BASE_URL = 'https://auth.mercadopago.com';
const TOKEN_TIMEOUT_MS = 15_000;

const LINK_PATH = '/profile/mercado-pago';

/** The feature is on only when the client id, client secret and token key are all set. */
export function mpOauthEnabled(): boolean {
	return !!(env.MP_CLIENT_ID && env.MP_CLIENT_SECRET && env.MP_TOKEN_KEY);
}

// Tokens: AES-256-GCM with MP_TOKEN_KEY (format in ../token-crypto.ts).
export const encryptToken = (plain: string, userId: string) =>
	encryptWith(plain, userId, env.MP_TOKEN_KEY);
export const decryptToken = (stored: string, userId: string) =>
	decryptWith(stored, userId, env.MP_TOKEN_KEY);

const redirectUri = (origin: string) => callbackUrl(LINK_PATH, origin);

/** New PKCE verifier and CSRF state, plus the authorization URL for them. */
function startAuthorization(origin: string) {
	const { state, verifier, challenge } = pkce();
	const params = new URLSearchParams({
		client_id: env.MP_CLIENT_ID ?? '',
		response_type: 'code',
		platform_id: 'mp',
		state,
		redirect_uri: redirectUri(origin),
		code_challenge: challenge,
		code_challenge_method: 'S256'
	});
	const base = env.MP_AUTH_BASE_URL || DEFAULT_AUTH_BASE_URL;
	return { state, verifier, url: `${base}/authorization?${params}` };
}

type TokenGrant = {
	accessToken: string;
	refreshToken: string | null;
	expiresAt: Date;
	mpUserId: string;
};

type TokenResult =
	| { ok: true; grant: TokenGrant }
	// 'rejected': MP answered 400/401. 'unavailable': network error, timeout, 5xx or a malformed answer.
	| { ok: false; reason: 'rejected' | 'unavailable' };

async function requestToken(body: Record<string, string>): Promise<TokenResult> {
	let res: Response;
	try {
		res = await fetch(mpApiBaseUrl() + '/oauth/token', {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: JSON.stringify({
				...body,
				client_id: env.MP_CLIENT_ID,
				client_secret: env.MP_CLIENT_SECRET
			}),
			signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS)
		});
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
	if (res.status === 400 || res.status === 401) return { ok: false, reason: 'rejected' };
	if (!res.ok) return { ok: false, reason: 'unavailable' };
	try {
		const j = await res.json();
		if (typeof j.access_token !== 'string' || !(Number(j.expires_in) > 0) || j.user_id == null) {
			return { ok: false, reason: 'unavailable' };
		}
		return {
			ok: true,
			grant: {
				accessToken: j.access_token,
				refreshToken: typeof j.refresh_token === 'string' ? j.refresh_token : null,
				expiresAt: new Date(Date.now() + Number(j.expires_in) * 1000),
				mpUserId: String(j.user_id)
			}
		};
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
}

/** Exchanges the authorization code and stores the connection (keeps the chosen account). 'exchange' on any failure. */
async function exchangeCode(
	userId: string,
	code: string,
	verifier: string,
	origin: string
): Promise<'ok' | 'exchange'> {
	const r = await requestToken({
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri(origin),
		code_verifier: verifier
	});
	if (!r.ok) return 'exchange';
	const { grant } = r;
	const tokens = {
		mpUserId: grant.mpUserId,
		accessToken: encryptToken(grant.accessToken, userId),
		refreshToken: grant.refreshToken ? encryptToken(grant.refreshToken, userId) : null,
		expiresAt: grant.expiresAt,
		needsReconnect: false
	};
	await db
		.insert(mpConnections)
		.values({ ...userOwned(userId), ...tokens })
		.onConflictDoUpdate({ target: mpConnections.userId, set: tokens })
		.returning({ accountId: mpConnections.accountId })
		.then(async ([row]) => {
			// A relink ends the "reconnect" notice the inbox shows from the last sync.
			if (row?.accountId) {
				await db
					.update(mpSyncState)
					.set({ lastError: null })
					.where(
						and(eq(mpSyncState.accountId, row.accountId), eq(mpSyncState.lastError, 'reconnect'))
					);
			}
		});
	return 'ok';
}

type RefreshOutcome = 'ok' | 'reconnect' | 'error';

/**
 * Rotates the user's tokens. Call it only while holding the account lease. 'reconnect' means the row now has
 * needs_reconnect=true (the caller records last_error='reconnect'); 'error' is transient (retry next run).
 * The update is conditional on the old refresh ciphertext, so a concurrent refresh is not overwritten.
 */
export async function refreshConnection(userId: string): Promise<RefreshOutcome> {
	const [conn] = await db
		.select({ refreshToken: mpConnections.refreshToken })
		.from(mpConnections)
		.where(canAccessOwn(userId, mpConnections))
		.limit(1);
	if (!conn) return 'reconnect';
	const reconnect = async (): Promise<RefreshOutcome> => {
		await db
			.update(mpConnections)
			.set({ needsReconnect: true })
			.where(
				and(
					canAccessOwn(userId, mpConnections),
					// Same condition as the success path: a concurrent relink or refresh is not re-flagged.
					conn.refreshToken
						? eq(mpConnections.refreshToken, conn.refreshToken)
						: isNull(mpConnections.refreshToken)
				)
			);
		return 'reconnect';
	};
	if (!conn.refreshToken) return reconnect();
	let old: string;
	try {
		old = decryptToken(conn.refreshToken, userId);
	} catch {
		return reconnect();
	}
	const r = await requestToken({ grant_type: 'refresh_token', refresh_token: old });
	if (!r.ok) return r.reason === 'rejected' ? reconnect() : 'error';
	const { grant } = r;
	if (!grant.refreshToken) return reconnect();
	await db
		.update(mpConnections)
		.set({
			accessToken: encryptToken(grant.accessToken, userId),
			refreshToken: encryptToken(grant.refreshToken, userId),
			expiresAt: grant.expiresAt,
			needsReconnect: false
		})
		.where(
			and(canAccessOwn(userId, mpConnections), eq(mpConnections.refreshToken, conn.refreshToken))
		);
	return 'ok';
}

// --- Stored tokens (they never leave this module except through getAccessToken) ---

/**
 * Decrypted access token and expiry for the sync, or null when not linked or the token cannot be decrypted
 * (wrong or rotated MP_TOKEN_KEY, corrupt data): then the connection is flagged needs_reconnect.
 * Never pass the token to a client.
 */
export async function getAccessToken(userId: string) {
	const [row] = await db
		.select({ accessToken: mpConnections.accessToken, expiresAt: mpConnections.expiresAt })
		.from(mpConnections)
		.where(canAccessOwn(userId, mpConnections))
		.limit(1);
	if (!row) return null;
	try {
		return { token: decryptToken(row.accessToken, userId), expiresAt: row.expiresAt };
	} catch {
		await db
			.update(mpConnections)
			.set({ needsReconnect: true })
			.where(
				and(canAccessOwn(userId, mpConnections), eq(mpConnections.accessToken, row.accessToken))
			);
		return null;
	}
}

/** The user's connection without any token (the account it feeds, also while a reconnect is pending), or null when not linked. */
export async function mpConnection(userId: string) {
	const [row] = await db
		.select({ accountId: mpConnections.accountId, needsReconnect: mpConnections.needsReconnect })
		.from(mpConnections)
		.where(canAccessOwn(userId, mpConnections))
		.limit(1);
	return row ?? null;
}

/** Users whose connection can sync: an account is chosen and no reconnect is pending. */
export async function listUsableConnections(): Promise<string[]> {
	const rows = await db
		.select({ userId: mpConnections.userId })
		.from(mpConnections)
		.where(and(isNotNull(mpConnections.accountId), eq(mpConnections.needsReconnect, false)));
	return rows.map((r) => r.userId);
}

/** Deletes the connection. Items, rules and sync state stay. */
async function deleteConnection(userId: string): Promise<void> {
	await db.delete(mpConnections).where(canAccessOwn(userId, mpConnections));
}

export const MP_LINK: OAuthLink<never> = {
	path: LINK_PATH,
	cookie: 'mp_oauth',
	enabled: mpOauthEnabled,
	flashes: { exchange: 'Mercado Pago no respondió. Probá de nuevo.' },
	limitStart: true,
	start: async (origin) => startAuthorization(origin),
	exchange: exchangeCode,
	unlink: deleteConnection
};
