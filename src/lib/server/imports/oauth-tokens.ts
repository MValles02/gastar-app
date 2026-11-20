import { and, eq, isNull } from 'drizzle-orm';
import { canAccessOwn } from '../access';
import { db } from '../db';
import type { gmailConnections, mpConnections } from '../db/schema';
import { decryptToken, encryptToken } from './token-crypto';

export const TOKEN_TIMEOUT_MS = 15_000;

type TokenGrant<E> = {
	accessToken: string;
	refreshToken: string | null;
	expiresAt: Date;
} & E;

// 'rejected': the provider refused the grant. 'unavailable': network error, timeout, 5xx or a malformed answer.
export type TokenResult<E> =
	{ ok: true; grant: TokenGrant<E> } | { ok: false; reason: 'rejected' | 'unavailable' };

/**
 * POSTs to a token endpoint. `isRejected` may read the body; `extra` validates and extracts the
 * provider-specific fields of a good answer (null: malformed).
 */
export async function requestToken<E extends object>(
	req: { url: string; contentType: string; body: string | URLSearchParams },
	isRejected: (res: Response) => boolean | Promise<boolean>,
	extra: (json: Record<string, unknown>) => E | null
): Promise<TokenResult<E>> {
	let res: Response;
	try {
		res = await fetch(req.url, {
			method: 'POST',
			headers: { 'content-type': req.contentType, accept: 'application/json' },
			body: req.body,
			signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS)
		});
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
	try {
		if (await isRejected(res)) return { ok: false, reason: 'rejected' };
		if (!res.ok) return { ok: false, reason: 'unavailable' };
		const j: Record<string, unknown> = await res.json();
		if (typeof j.access_token !== 'string' || !(Number(j.expires_in) > 0)) {
			return { ok: false, reason: 'unavailable' };
		}
		const more = extra(j);
		if (!more) return { ok: false, reason: 'unavailable' };
		return {
			ok: true,
			grant: {
				accessToken: j.access_token,
				refreshToken: typeof j.refresh_token === 'string' ? j.refresh_token : null,
				expiresAt: new Date(Date.now() + Number(j.expires_in) * 1000),
				...more
			}
		};
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
}

type RefreshOutcome = 'ok' | 'reconnect' | 'error';

/**
 * Encrypted token storage and rotation for one provider's connection table (format in ./token-crypto.ts).
 * `refreshRotates`: the provider must return a new refresh token on every refresh, else a reconnect is needed.
 */
export function tokenStore(cfg: {
	table: typeof mpConnections | typeof gmailConnections;
	key: () => string | undefined;
	request: (body: Record<string, string>) => Promise<TokenResult<object>>;
	refreshRotates: boolean;
}) {
	const { table, key, request, refreshRotates } = cfg;
	const encrypt = (plain: string, userId: string) => encryptToken(plain, userId, key());
	const decrypt = (stored: string, userId: string) => decryptToken(stored, userId, key());

	/**
	 * Rotates the user's tokens. Call it only while holding the account lease. 'reconnect' means the row now has
	 * needs_reconnect=true (the caller records last_error='reconnect'); 'error' is transient (retry next run).
	 * The update is conditional on the old refresh ciphertext, so a concurrent refresh or relink is not overwritten.
	 */
	async function refreshConnection(userId: string): Promise<RefreshOutcome> {
		const [conn] = await db
			.select({ refreshToken: table.refreshToken })
			.from(table)
			.where(canAccessOwn(userId, table))
			.limit(1);
		if (!conn) return 'reconnect';
		const unchanged = and(
			canAccessOwn(userId, table),
			conn.refreshToken ? eq(table.refreshToken, conn.refreshToken) : isNull(table.refreshToken)
		);
		const reconnect = async (): Promise<RefreshOutcome> => {
			await db.update(table).set({ needsReconnect: true }).where(unchanged);
			return 'reconnect';
		};
		if (!conn.refreshToken) return reconnect();
		let old: string;
		try {
			old = decrypt(conn.refreshToken, userId);
		} catch {
			return reconnect();
		}
		const r = await request({ grant_type: 'refresh_token', refresh_token: old });
		if (!r.ok) return r.reason === 'rejected' ? reconnect() : 'error';
		const { grant } = r;
		if (refreshRotates && !grant.refreshToken) return reconnect();
		await db
			.update(table)
			.set({
				accessToken: encrypt(grant.accessToken, userId),
				...(grant.refreshToken ? { refreshToken: encrypt(grant.refreshToken, userId) } : {}),
				expiresAt: grant.expiresAt,
				needsReconnect: false
			})
			.where(unchanged);
		return 'ok';
	}

	/**
	 * Decrypted access token and expiry for the sync, or null when not linked or the token cannot be decrypted
	 * (wrong or rotated key, corrupt data): then the connection is flagged needs_reconnect.
	 * Never pass the token to a client.
	 */
	async function getAccessToken(userId: string) {
		const [row] = await db
			.select({ accessToken: table.accessToken, expiresAt: table.expiresAt })
			.from(table)
			.where(canAccessOwn(userId, table))
			.limit(1);
		if (!row) return null;
		try {
			return { token: decrypt(row.accessToken, userId), expiresAt: row.expiresAt };
		} catch {
			await db
				.update(table)
				.set({ needsReconnect: true })
				.where(and(canAccessOwn(userId, table), eq(table.accessToken, row.accessToken)));
			return null;
		}
	}

	return { encrypt, decrypt, getAccessToken, refreshConnection };
}
