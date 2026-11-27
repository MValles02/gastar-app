import { and, eq } from 'drizzle-orm';
import * as env from '$app/env/private';
import { es } from '#lib/copy/es.ts';
import { canAccessOwn, userOwned } from '../../access';
import { db } from '../../db';
import { account, gmailConnections } from '../../db/schema';
import { GOOGLE_PROVIDER_ID } from '../../reauth';
import { callbackUrl, type OAuthLink, pkce } from '../oauth-link';
import { requestToken as postToken, TOKEN_TIMEOUT_MS, tokenStore } from '../oauth-tokens';
import { GMAIL_ENV, gmailApiBaseUrl, gmailAuthBaseUrl } from './env';

const SCOPE_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';

// Gmail has its own Google Cloud client and key: never the sign-in GOOGLE_* client or Better Auth.
const LINK_PATH = '/profile/gmail';

/** The feature is on only when the client id, client secret and token key are all set. */
export function gmailOauthEnabled(): boolean {
	return GMAIL_ENV.vars.every((name) => !!env[name]);
}

const redirectUri = (origin: string) => callbackUrl(LINK_PATH, origin);

/** True when the user also signs in with Google (Better Auth `account` row), so the email is a safe hint. */
async function usesGoogleSignIn(userId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: account.id })
		.from(account)
		.where(and(canAccessOwn(userId, account), eq(account.providerId, GOOGLE_PROVIDER_ID)))
		.limit(1);
	return !!row;
}

/** New PKCE verifier and CSRF state, plus the authorization URL for them. */
async function startAuthorization(origin: string, user: { id: string; email: string }) {
	const { state, verifier, challenge } = pkce();
	const params = new URLSearchParams({
		client_id: env.GMAIL_CLIENT_ID ?? '',
		response_type: 'code',
		redirect_uri: redirectUri(origin),
		scope: `openid email ${SCOPE_READONLY}`,
		access_type: 'offline',
		// Every link must return a refresh token.
		prompt: 'consent',
		state,
		code_challenge: challenge,
		code_challenge_method: 'S256'
	});
	if (await usesGoogleSignIn(user.id)) params.set('login_hint', user.email);
	return { state, verifier, url: `${gmailAuthBaseUrl()}/o/oauth2/v2/auth?${params}` };
}

const requestToken = (body: Record<string, string>) =>
	postToken(
		{
			url: gmailApiBaseUrl() + '/token',
			contentType: 'application/x-www-form-urlencoded',
			body: new URLSearchParams({
				...body,
				client_id: env.GMAIL_CLIENT_ID ?? '',
				client_secret: env.GMAIL_CLIENT_SECRET ?? ''
			})
		},
		// 400 invalid_grant: revoked, expired or reused. Any other failure is transient.
		async (res) => res.status === 400 && (await res.json())?.error === 'invalid_grant',
		(j) => ({
			scope: typeof j.scope === 'string' ? j.scope : '',
			idToken: typeof j.id_token === 'string' ? j.id_token : null
		})
	);

// Google does not rotate refresh tokens: the stored one stays unless an answer carries a new one.
const store = tokenStore({
	table: gmailConnections,
	key: () => env.GMAIL_TOKEN_KEY,
	request: requestToken,
	refreshRotates: false
});
export const { getAccessToken, refreshConnection } = store;

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
async function exchangeCode(
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
		accessToken: store.encrypt(grant.accessToken, userId),
		refreshToken: store.encrypt(grant.refreshToken, userId),
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

/**
 * The user's connection without any token: the linked address, whether a reconnect is pending, and the last
 * sync (when it ended, its error code, its lease); null when not linked.
 */
export async function gmailConnection(userId: string) {
	const [row] = await db
		.select({
			email: gmailConnections.email,
			needsReconnect: gmailConnections.needsReconnect,
			lastRunAt: gmailConnections.lastRunAt,
			lastErrorCode: gmailConnections.lastErrorCode,
			runningSince: gmailConnections.syncRunningSince
		})
		.from(gmailConnections)
		.where(canAccessOwn(userId, gmailConnections))
		.limit(1);
	return row ?? null;
}

/** Best-effort revoke of the user's grant at Google. Never throws; the row stays. */
export async function revokeGmail(userId: string): Promise<void> {
	try {
		const [row] = await db
			.select({ refreshToken: gmailConnections.refreshToken })
			.from(gmailConnections)
			.where(canAccessOwn(userId, gmailConnections))
			.limit(1);
		if (row) await revokeToken(store.decrypt(row.refreshToken, userId));
	} catch {
		// Undecryptable or DB error: the user can still revoke from their Google account.
	}
}

/** Revokes the grant at Google (best effort), then deletes the connection. */
async function unlinkGmail(userId: string): Promise<void> {
	await revokeGmail(userId);
	await db.delete(gmailConnections).where(canAccessOwn(userId, gmailConnections));
}

export const GMAIL_LINK: OAuthLink<'scope'> = {
	path: LINK_PATH,
	cookie: 'gmail_oauth',
	enabled: gmailOauthEnabled,
	flashes: es.profile.gmail.flashes,
	limitStart: true,
	start: startAuthorization,
	exchange: exchangeCode,
	unlink: unlinkGmail
};
