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
const TZ = 'America/Argentina/Buenos_Aires';

// Same as normalizeDescription in src/lib/server/recurring/link.ts (this script cannot import app code).
const normalizeDescription = (s) => s.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
const daysInMonth = (ym) =>
	new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();

/**
 * One-time backfill (runs only in the migration that adds mp_import_rules.recurring_id): links unlinked
 * income/outcome movements of the previous and current local month to active fixed-payment rules with
 * the same matching as linkRuleFor (type, currency, one per rule per month, description, closest day).
 * Never changes a rule amount.
 */
async function backfillRecurringLinks(sql) {
	const linked = await sql.begin(async (tx) => {
		const rules = await tx`
			select r.id, r.user_id, r.type, r.description, r.day_of_month, a.currency
			from recurring_movements r
			join financial_accounts a on a.id = r.account_id and a.owner_id = r.user_id
			join categories c on c.id = r.category_id and c.user_id = r.user_id
			where r.archived_at is null and a.archived_at is null and c.archived_at is null`;
		const candidates = await tx`
			select m.id, m.user_id, m.type, m.description, a.currency,
				to_char(m.occurred_at at time zone ${TZ}::text, 'YYYY-MM') as ym,
				extract(day from m.occurred_at at time zone ${TZ}::text)::int as day
			from movements m
			join financial_accounts a on a.id = m.account_id and a.owner_id = m.user_id
			where m.recurring_id is null and m.type in ('income', 'outcome')
				and m.occurred_at >= (date_trunc('month', now() at time zone ${TZ}::text) - interval '1 month') at time zone ${TZ}::text
				and m.occurred_at < (date_trunc('month', now() at time zone ${TZ}::text) + interval '1 month') at time zone ${TZ}::text
			order by m.occurred_at, m.created_at, m.id`;
		const takenRows = await tx`
			select r.id as rule_id, to_char(m.occurred_at at time zone ${TZ}::text, 'YYYY-MM') as ym
			from movements m
			join financial_accounts a on a.id = m.account_id and a.owner_id = m.user_id
			join recurring_movements r on r.id = m.recurring_id
			join financial_accounts ra on ra.id = r.account_id
			where m.type = r.type and a.currency = ra.currency
				and m.occurred_at >= (date_trunc('month', now() at time zone ${TZ}::text) - interval '1 month') at time zone ${TZ}::text
				and m.occurred_at < (date_trunc('month', now() at time zone ${TZ}::text) + interval '1 month') at time zone ${TZ}::text`;
		const taken = new Set(takenRows.map((t) => `${t.rule_id}|${t.ym}`));

		let count = 0;
		for (const m of candidates) {
			const wanted = normalizeDescription(m.description);
			const dist = (r) => Math.abs(Math.min(r.day_of_month, daysInMonth(m.ym)) - m.day);
			const rule = rules
				.filter(
					(r) =>
						r.user_id === m.user_id &&
						r.type === m.type &&
						r.currency === m.currency &&
						!taken.has(`${r.id}|${m.ym}`) &&
						normalizeDescription(r.description) === wanted
				)
				.sort(
					(a, b) => dist(a) - dist(b) || a.day_of_month - b.day_of_month || (a.id < b.id ? -1 : 1)
				)[0];
			if (!rule) continue;
			// updated_at is left alone: this is not an edit.
			const res =
				await tx`update movements set recurring_id = ${rule.id} where id = ${m.id} and recurring_id is null`;
			if (res.count === 1) {
				taken.add(`${rule.id}|${m.ym}`);
				count++;
			}
		}
		return count;
	});
	console.log(`Backfill: linked ${linked} movement(s) to fixed payments`);
}

try {
	await client`SELECT pg_advisory_lock(${LOCK_ID}::bigint)`;
	const [{ had }] = await client`
		select exists (
			select 1 from information_schema.columns
			where table_schema = current_schema() and table_name = 'mp_import_rules' and column_name = 'recurring_id'
		) as had`;
	await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	console.log('Migrations applied successfully');
	// Runs once per database: only the run that adds the column, so manual unlinks are never undone.
	if (!had) {
		try {
			await backfillRecurringLinks(client);
		} catch (err) {
			console.error('Backfill of recurring links failed (non-fatal):', err);
		}
	}
} catch (err) {
	console.error('Migration failed:', err);
	process.exitCode = 1;
} finally {
	await client`SELECT pg_advisory_unlock(${LOCK_ID}::bigint)`.catch(() => {});
	await client.end();
}
