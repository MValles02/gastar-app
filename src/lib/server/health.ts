import { db } from '#lib/server/db/index.ts';
import { sql } from 'drizzle-orm';

/** Resolves when the database answers a trivial query, rejects otherwise. */
export const pingDb = async () => {
	await db.execute(sql`select 1`);
};
