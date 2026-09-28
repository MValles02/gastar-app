import { db } from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';

export async function GET() {
	const headers = { 'Cache-Control': 'no-store' };
	try {
		await db.execute(sql`select 1`);
		return json({ status: 'ok', sha: env.GIT_SHA ?? null }, { headers });
	} catch {
		return json({ status: 'error' }, { status: 503, headers });
	}
}
