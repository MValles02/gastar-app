import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// postgres.js connects lazily, so an empty/invalid URL only fails on first
// query (surfaced as a 503 by /health), not at import/build time.
const client = postgres(env.DATABASE_URL ?? '');

export const db = drizzle(client, { schema });
