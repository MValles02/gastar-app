import { and, eq, isNotNull } from 'drizzle-orm';
import { RECENT_SESSION_MS } from '#lib/server/constants.ts';
import { db } from './db';
import { account } from './db/schema';

export const GOOGLE_PROVIDER_ID = 'google';
export const CREDENTIAL_PROVIDER_ID = 'credential';

export async function hasPassword(userId: string): Promise<boolean> {
	const rows = await db
		.select({ id: account.id })
		.from(account)
		.where(
			and(
				eq(account.userId, userId),
				eq(account.providerId, CREDENTIAL_PROVIDER_ID),
				isNotNull(account.password)
			)
		)
		.limit(1);
	return rows.length > 0;
}

function isRecentSession(session: { createdAt: Date | string } | null): boolean {
	return !!session && Date.now() - new Date(session.createdAt).getTime() <= RECENT_SESSION_MS;
}

export type ReauthMode = 'password' | 'recent' | 'stale';

/** How the user proves identity for a sensitive action: password, a recent sign-in, or a fresh Google sign-in. */
export async function reauthMode(
	userId: string,
	session: { createdAt: Date | string } | null
): Promise<ReauthMode> {
	if (await hasPassword(userId)) return 'password';
	return isRecentSession(session) ? 'recent' : 'stale';
}
