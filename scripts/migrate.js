import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client);

// Session advisory lock: start-first deploys may run two migrators at once.
const LOCK_ID = 727274001;
const MIGRATIONS_FOLDER = './drizzle';

try {
	await client`SELECT pg_advisory_lock(${LOCK_ID}::bigint)`;
	await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	console.log('Migrations applied successfully');
} catch (err) {
	console.error('Migration failed:', err);
	process.exitCode = 1;
} finally {
	await client`SELECT pg_advisory_unlock(${LOCK_ID}::bigint)`.catch(() => {});
	await client.end();
}
