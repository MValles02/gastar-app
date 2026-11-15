import { db } from '#lib/server/db/index.ts';
import { sql } from 'drizzle-orm';

export const pingDb = async () => {
	await db.execute(sql`select 1`);
};
