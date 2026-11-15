import { pingDb } from '#lib/server/health.ts';
import * as env from '$app/env/private';

export async function GET() {
	const headers = { 'Cache-Control': 'no-store' };
	try {
		await pingDb();
		return Response.json({ status: 'ok', sha: env.GIT_SHA ?? null }, { headers });
	} catch {
		return Response.json({ status: 'error' }, { status: 503, headers });
	}
}
