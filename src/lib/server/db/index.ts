import * as env from '$app/env/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// postgres.js connects lazily, so an empty/invalid URL only fails on first
// query (surfaced as a 503 by /health), not at import/build time.
// One pool per process: Vite HMR re-evaluates this module in dev, and a new
// pool per reload leaked connections until Postgres hit max_connections (#180).
const g = globalThis as typeof globalThis & { __gastarPg?: ReturnType<typeof postgres> };

const client = (g.__gastarPg ??= postgres(env.DATABASE_URL ?? ''));

export const db = drizzle(client, { schema });

/** The db or a transaction callback's handle. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbExecutor = Tx | typeof db;
