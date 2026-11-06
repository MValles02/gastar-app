import { pingDb } from '$lib/server/health';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

export async function GET() {
	const headers = { 'Cache-Control': 'no-store' };
	try {
		await pingDb();
		return json({ status: 'ok', sha: env.GIT_SHA ?? null }, { headers });
	} catch {
		return json({ status: 'error' }, { status: 503, headers });
	}
}
