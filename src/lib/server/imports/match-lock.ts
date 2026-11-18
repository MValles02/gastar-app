import { AsyncLocalStorage } from 'node:async_hooks';
import { lockClient } from '../db';

/**
 * Runs `fn` holding a per-user Postgres advisory lock, so two matching runs of one user (a Gmail sync and a
 * card save, two uploads of one statement) never interleave their claim and insert. Session-level on a
 * connection reserved from the small lock pool (never the main one, which `fn` needs), not a transaction
 * lock: ingestImportItems (and its auto-approval) use the shared pool and must stay outside any
 * transaction. A wait longer than the lock pool's lock_timeout throws. Nesting for the same user throws.
 */
const held = new AsyncLocalStorage<Set<string>>();
export async function withMatchLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
	const outer = held.getStore();
	if (outer?.has(userId)) throw new Error('withMatchLock is not reentrant');
	const conn = await lockClient.reserve();
	try {
		await conn`select pg_advisory_lock(hashtext(${'card-match:' + userId}))`;
		try {
			return await held.run(new Set([...(outer ?? []), userId]), fn);
		} finally {
			await conn`select pg_advisory_unlock(hashtext(${'card-match:' + userId}))`;
		}
	} finally {
		conn.release();
	}
}
