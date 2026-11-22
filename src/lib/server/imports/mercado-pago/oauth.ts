import { and, eq, isNotNull } from 'drizzle-orm';
import * as env from '$app/env/private';
import type { EnvGroup } from '../../env-check';
import { canAccessOwn, userOwned } from '../../access';
import { db } from '../../db';
import { mpConnections, mpSyncState } from '../../db/schema';
import { callbackUrl, type OAuthLink, pkce } from '../oauth-link';
import { requestToken as postToken, tokenStore } from '../oauth-tokens';
import { mpApiBaseUrl } from './env';

const DEFAULT_AUTH_BASE_URL = 'https://auth.mercadopago.com';

const LINK_PATH = '/profile/mercado-pago';

/**
 * The Mercado Pago link's env vars. Not all-or-none: a partial set only leaves the link off, as before
 * checkEnv read these groups (enforcing it could stop a deploy that starts today).
 */
export const MP_ENV = {
	vars: ['MP_CLIENT_ID', 'MP_CLIENT_SECRET', 'MP_TOKEN_KEY'],
	key: 'MP_TOKEN_KEY',
	allOrNone: false
} as const satisfies EnvGroup;

/** The feature is on only when the client id, client secret and token key are all set. */
export function mpOauthEnabled(): boolean {
	return MP_ENV.vars.every((name) => !!env[name]);
}

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

const requestToken = (body: Record<string, string>) =>
	postToken(
		{
			url: mpApiBaseUrl() + '/oauth/token',
			contentType: 'application/json',
			body: JSON.stringify({
				...body,
				client_id: env.MP_CLIENT_ID,
				client_secret: env.MP_CLIENT_SECRET
			})
		},
		// MP answers 400/401 for a bad grant; the body is not read.
		(res) => res.status === 400 || res.status === 401,
		(j) => (j.user_id == null ? null : { mpUserId: String(j.user_id) })
	);

const store = tokenStore({
	table: mpConnections,
	key: () => env.MP_TOKEN_KEY,
	request: requestToken,
	refreshRotates: true
});
export const { getAccessToken, refreshConnection } = store;

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
		accessToken: store.encrypt(grant.accessToken, userId),
		refreshToken: grant.refreshToken ? store.encrypt(grant.refreshToken, userId) : null,
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
