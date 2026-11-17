import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from './db';
import { account } from './db/schema';

/** Whether the user has a password (Google-only users do not). */
export async function hasPassword(userId: string): Promise<boolean> {
	const rows = await db
		.select({ id: account.id })
		.from(account)
		.where(
			and(
				eq(account.userId, userId),
				eq(account.providerId, 'credential'),
				isNotNull(account.password)
			)
		)
		.limit(1);
	return rows.length > 0;
}

/** How long after signing in a password-less user may still create a password or delete the account. */
export const RECENT_SESSION_MS = 5 * 60_000;

export function isRecentSession(session: { createdAt: Date | string } | null): boolean {
	return !!session && Date.now() - new Date(session.createdAt).getTime() <= RECENT_SESSION_MS;
}
