import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { and, eq, isNotNull, isNull, lt, min } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import {
	canAccessAccount,
	canAccessImport,
	canAccessMpConnection,
	mpConnectionOwnedBy
} from './access';
import { db } from './db';
import { financialAccounts, mpConnections, mpImportItems, mpSyncState } from './db/schema';
import { mpApiBaseUrl } from './mp-env';
import { localDay } from './month';

const DEFAULT_AUTH_BASE_URL = 'https://auth.mercadopago.com';
/** How far back a first sync reaches when the user has not chosen an "importar desde" day. */
export const DEFAULT_BACKFILL_DAYS = 30;
const TOKEN_TIMEOUT_MS = 15_000;
const FORMAT = 'v1:';

export const OAUTH_COOKIE = 'mp_oauth';
export const OAUTH_PATH = '/profile/mercado-pago';
export const CALLBACK_PATH = `${OAUTH_PATH}/callback`;

/** The feature is on only when the client id, client secret and token key are all set. */
export function mpOauthEnabled(): boolean {
	return !!(env.MP_CLIENT_ID && env.MP_CLIENT_SECRET && env.MP_TOKEN_KEY);
}

// --- Token encryption: "v1:" + base64(iv(12) | tag(16) | ct), AES-256-GCM, AAD = user id ---

const key = () => Buffer.from(env.MP_TOKEN_KEY ?? '', 'base64');

export function encryptToken(plain: string, userId: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key(), iv);
	cipher.setAAD(Buffer.from(userId));
	const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
	return FORMAT + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

export function decryptToken(stored: string, userId: string): string {
	if (!stored.startsWith(FORMAT)) throw new Error('mp token: unknown format');
	const raw = Buffer.from(stored.slice(FORMAT.length), 'base64');
	if (raw.length < 28) throw new Error('mp token: too short');
	const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12), {
		authTagLength: 16
	});
	decipher.setAAD(Buffer.from(userId));
	decipher.setAuthTag(raw.subarray(12, 28));
	return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}

// --- Authorization ---

const b64url = (buf: Buffer) => buf.toString('base64url');

export const redirectUri = (origin: string) => origin + CALLBACK_PATH;

/** New PKCE verifier and CSRF state, plus the authorization URL for them. */
export function startAuthorization(origin: string) {
	const state = b64url(randomBytes(32));
	const verifier = b64url(randomBytes(32));
	const params = new URLSearchParams({
		client_id: env.MP_CLIENT_ID ?? '',
		response_type: 'code',
		platform_id: 'mp',
		state,
		redirect_uri: redirectUri(origin),
		code_challenge: b64url(createHash('sha256').update(verifier).digest()),
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

/** Exchanges the authorization code and stores the connection (keeps the chosen account). Returns false on any failure. */
export async function exchangeCode(
	userId: string,
	code: string,
	verifier: string,
	origin: string
): Promise<boolean> {
	const r = await requestToken({
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri(origin),
		code_verifier: verifier
	});
	if (!r.ok) return false;
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
		.values({ ...mpConnectionOwnedBy(userId), ...tokens })
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
	return true;
}

export type RefreshOutcome = 'ok' | 'reconnect' | 'error';

/**
 * Rotates the user's tokens. Call it only while holding the account lease. 'reconnect' means the row now has
 * needs_reconnect=true (the caller records last_error='reconnect'); 'error' is transient (retry next run).
 * The update is conditional on the old refresh ciphertext, so a concurrent refresh is not overwritten.
 */
export async function refreshConnection(userId: string): Promise<RefreshOutcome> {
	const [conn] = await db
		.select({ refreshToken: mpConnections.refreshToken })
		.from(mpConnections)
		.where(canAccessMpConnection(userId))
		.limit(1);
	if (!conn) return 'reconnect';
	const reconnect = async (): Promise<RefreshOutcome> => {
		await db
			.update(mpConnections)
			.set({ needsReconnect: true })
			.where(
				and(
					canAccessMpConnection(userId),
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
		.where(and(canAccessMpConnection(userId), eq(mpConnections.refreshToken, conn.refreshToken)));
	return 'ok';
}

// --- Connection queries (tokens never leave this module except through getAccessToken) ---

export type MpConnectionInfo = {
	accountId: string | null;
	accountName: string | null;
	needsReconnect: boolean;
};

/** The user's connection without any token, or null when not linked. */
export async function getConnectionInfo(userId: string): Promise<MpConnectionInfo | null> {
	const [row] = await db
		.select({
			accountId: mpConnections.accountId,
			accountName: financialAccounts.name,
			needsReconnect: mpConnections.needsReconnect
		})
		.from(mpConnections)
		.leftJoin(financialAccounts, eq(financialAccounts.id, mpConnections.accountId))
		.where(canAccessMpConnection(userId))
		.limit(1);
	return row ?? null;
}

/** The account the user's Mercado Pago connection feeds (also while a reconnect is pending), else null. */
export async function getMpImportAccount(userId: string) {
	const conn = await getConnectionInfo(userId);
	return conn?.accountId ? { id: conn.accountId, name: conn.accountName ?? '' } : null;
}

/** How the user's Mercado Pago connection stands: linked, needing a reconnect, or not linked. */
export async function mpLinkState(userId: string): Promise<'linked' | 'reconnect' | 'unlinked'> {
	const conn = await getConnectionInfo(userId);
	if (conn?.needsReconnect) return 'reconnect';
	if (conn?.accountId) return 'linked';
	return 'unlinked';
}

/**
 * Decrypted access token and expiry for the sync, or null when not linked or the token cannot be decrypted
 * (wrong or rotated MP_TOKEN_KEY, corrupt data): then the connection is flagged needs_reconnect.
 * Never pass the token to a client.
 */
export async function getAccessToken(userId: string) {
	const [row] = await db
		.select({ accessToken: mpConnections.accessToken, expiresAt: mpConnections.expiresAt })
		.from(mpConnections)
		.where(canAccessMpConnection(userId))
		.limit(1);
	if (!row) return null;
	try {
		return { token: decryptToken(row.accessToken, userId), expiresAt: row.expiresAt };
	} catch {
		await db
			.update(mpConnections)
			.set({ needsReconnect: true })
			.where(and(canAccessMpConnection(userId), eq(mpConnections.accessToken, row.accessToken)));
		return null;
	}
}

/** Users whose connection can sync: an account is chosen and no reconnect is pending. */
export async function listUsableConnections(): Promise<string[]> {
	const rows = await db
		.select({ userId: mpConnections.userId })
		.from(mpConnections)
		.where(and(isNotNull(mpConnections.accountId), eq(mpConnections.needsReconnect, false)));
	return rows.map((r) => r.userId);
}

/** The user's active ARS accounts, the only valid receiving accounts. */
export async function listReceivingAccounts(userId: string) {
	return db
		.select({
			id: financialAccounts.id,
			name: financialAccounts.name,
			icon: financialAccounts.icon,
			color: financialAccounts.color
		})
		.from(financialAccounts)
		.where(
			and(
				canAccessAccount(userId),
				eq(financialAccounts.currency, 'ARS'),
				isNull(financialAccounts.archivedAt)
			)
		)
		.orderBy(financialAccounts.name);
}

/** Saves the receiving account. False when the account is not the user's, active and ARS, or there is no connection. */
export async function setReceivingAccount(userId: string, accountId: string): Promise<boolean> {
	if (!(await listReceivingAccounts(userId)).some((a) => a.id === accountId)) return false;
	const rows = await db
		.update(mpConnections)
		.set({ accountId })
		.where(canAccessMpConnection(userId))
		.returning({ userId: mpConnections.userId });
	return rows.length > 0;
}

/** The effective "importar desde" day (`YYYY-MM-DD`): the chosen one, else the earliest imported item's day, else 30 days back. */
export async function getImportFromDay(userId: string, accountId: string): Promise<string> {
	const [row] = await db
		.select({ chosen: mpConnections.importFrom })
		.from(mpConnections)
		.where(canAccessMpConnection(userId))
		.limit(1);
	if (row?.chosen) return localDay(row.chosen);
	const [first] = await db
		.select({ at: min(mpImportItems.occurredAt) })
		.from(mpImportItems)
		.where(and(canAccessImport(userId), eq(mpImportItems.accountId, accountId)));
	return localDay(first?.at ?? new Date(Date.now() - DEFAULT_BACKFILL_DAYS * 86_400_000));
}

/** Saves "importar desde" and drops the pending items of the account before it (approved and rejected ones stay). */
export async function setImportFrom(userId: string, accountId: string, from: Date): Promise<void> {
	await db.update(mpConnections).set({ importFrom: from }).where(canAccessMpConnection(userId));
	await db
		.delete(mpImportItems)
		.where(
			and(
				canAccessImport(userId),
				eq(mpImportItems.accountId, accountId),
				eq(mpImportItems.status, 'pending'),
				lt(mpImportItems.occurredAt, from)
			)
		);
}

/** Deletes the connection. Items, rules and sync state stay. */
export async function deleteConnection(userId: string): Promise<void> {
	await db.delete(mpConnections).where(canAccessMpConnection(userId));
}
