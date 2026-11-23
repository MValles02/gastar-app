// Copies one prod user's financial data over the same-email user on dev (daily, via a Dokploy Schedule).
// Plain JS; shares only src/lib/shared/runtime.js with the app. Never prints error messages, URLs, emails or row values.
import postgres from 'postgres';
import { ADVISORY_LOCK_ID, LOCAL_EMAIL_DOMAIN } from '../src/lib/shared/runtime.js';

const LOCK_ID = ADVISORY_LOCK_ID; // same id as migrate.js
const STALE = '15 minutes';

// Parents first. Second item: the scope column; null = scoped through spending_plans.
const TABLES = [
	['financial_accounts', 'owner_id'],
	['categories', 'user_id'],
	['recurring_movements', 'user_id'],
	['movements', 'user_id'],
	['spending_plans', 'user_id'],
	['plan_category_limits', null],
	['import_rules', 'user_id'],
	['import_items', 'user_id'],
	['card_statements', 'user_id'],
	['import_cards', 'user_id'],
	['card_alerts', 'user_id'],
	['import_settings', 'user_id']
];
// [table, fk column, target table]: every copied FK must point at the dev user's own rows.
const FKS = [
	['recurring_movements', 'account_id', 'financial_accounts'],
	['recurring_movements', 'category_id', 'categories'],
	['movements', 'account_id', 'financial_accounts'],
	['movements', 'destination_account_id', 'financial_accounts'],
	['movements', 'category_id', 'categories'],
	['movements', 'recurring_id', 'recurring_movements'],
	['plan_category_limits', 'plan_id', 'spending_plans'],
	['plan_category_limits', 'category_id', 'categories'],
	['import_rules', 'category_id', 'categories'],
	['import_rules', 'counter_account_id', 'financial_accounts'],
	['import_rules', 'recurring_id', 'recurring_movements'],
	['import_items', 'account_id', 'financial_accounts'],
	['import_items', 'movement_id', 'movements'],
	['import_cards', 'ars_account_id', 'financial_accounts'],
	['import_cards', 'usd_account_id', 'financial_accounts'],
	['card_alerts', 'import_item_id', 'import_items']
];
const scopeOf = (t) => TABLES.find(([n]) => n === t)[1];

const q = (n) => '"' + String(n).replace(/"/g, '""') + '"';
const fail = (name) => Object.assign(new Error(name), { name });

let stage = 'config';
let where = ''; // table or table.column being processed, for the failure line
const t0 = Date.now();

const prodUrl = process.env.PROD_READONLY_DATABASE_URL;
const devUrl = process.env.DATABASE_URL;
const prodEmail = (process.env.DEV_SYNC_EMAIL || '').trim().toLowerCase();
const devEmail = (process.env.DEV_SYNC_TARGET_EMAIL || prodEmail).trim().toLowerCase();

function abort(msg) {
	console.error(`dev-sync failed: ${msg}`);
	process.exit(1);
}
if (!prodUrl || !devUrl || !prodEmail) abort('config missing env');
try {
	const a = new URL(prodUrl);
	const b = new URL(devUrl);
	const port = (u) => u.port || '5432';
	if (a.hostname === b.hostname && port(a) === port(b) && a.pathname === b.pathname)
		abort('guard same database');
} catch {
	abort('config invalid url');
}
if (devEmail.endsWith(LOCAL_EMAIL_DOMAIN)) abort('guard target email');

// onnotice: false, because notices carry detail text.
const src = postgres(prodUrl, {
	max: 1,
	onnotice: false,
	connection: { default_transaction_read_only: 'on' }
});
const dst = postgres(devUrl, { max: 1, onnotice: false });

const columnsOf = async (sql) => {
	const rows = await sql`
		select table_name, column_name, is_nullable, column_default from information_schema.columns
		where table_schema = current_schema() and table_name in ${sql(TABLES.map(([n]) => n))}
		order by table_name, ordinal_position`;
	return Object.fromEntries(TABLES.map(([n]) => [n, rows.filter((r) => r.table_name === n)]));
};

const scopeWhere = (t, p) => {
	const s = scopeOf(t);
	return s ? `${q(s)} = ${p}` : `plan_id in (select id from spending_plans where user_id = ${p})`;
};
const notScopeWhere = (t, p) => {
	const s = scopeOf(t);
	return s
		? `${q(s)} <> ${p}`
		: `plan_id not in (select id from spending_plans where user_id = ${p})`;
};

try {
	stage = 'guard';
	const idOf = async (sql) => {
		const [r] =
			await sql`select current_database() || '|' || extract(epoch from pg_postmaster_start_time()) as id`;
		return r.id;
	};
	if ((await idOf(src)) === (await idOf(dst))) throw fail('guard same server');

	stage = 'read';
	const snap = await src.begin('isolation level repeatable read read only', async (tx) => {
		const [u] = await tx`select id from "user" where lower(email) = ${prodEmail}`;
		if (!u) throw fail('user missing');
		const cols = await columnsOf(tx);
		const data = {};
		const absent = new Set(); // not on prod yet: dev keeps its rows
		for (const [t] of TABLES) {
			where = t;
			if (!cols[t].length) {
				const [{ reg }] =
					await tx`select to_regclass(quote_ident(current_schema()) || '.' || quote_ident(${t})) as reg`;
				if (reg) {
					stage = 'schema';
					throw fail('no grant');
				}
				absent.add(t);
				continue;
			}
			const list = cols[t].map((c) => q(c.column_name)).join(', ');
			const [r] = await tx.unsafe(
				`select coalesce(json_agg(t), '[]')::text as j from (select ${list} from ${q(t)} where ${scopeWhere(t, '$1')}) t`,
				[u.id]
			);
			data[t] = r.j;
		}
		return { cols, data, absent };
	});
	where = '';

	stage = 'write';
	const logs = await dst.begin(async (tx) => {
		const [u] = await tx`select id from "user" where lower(email) = ${devEmail}`;
		if (!u) throw fail('user missing');
		const dev = u.id;

		await tx`select pg_advisory_xact_lock(${LOCK_ID}::bigint)`;
		const gm = await tx`select sync_running_since > now() - ${STALE}::interval as running
			from gmail_connections where user_id = ${dev} for update`;
		const sy = await tx`select running_since > now() - ${STALE}::interval as running
			from mp_sync_state where account_id in (select id from financial_accounts where owner_id = ${dev}) for update`;
		if ([...gm, ...sy].some((r) => r.running)) throw fail('sync running');

		// Schema drift: decide the column list per table.
		stage = 'drift';
		const devCols = await columnsOf(tx);
		const plan = {};
		for (const [t] of TABLES) {
			where = t;
			if (!devCols[t].length) throw fail('table missing');
			if (snap.absent.has(t)) continue;
			const have = new Set(devCols[t].map((c) => c.column_name));
			const prodNames = new Set(snap.cols[t].map((c) => c.column_name));
			for (const c of snap.cols[t]) {
				where = `${t}.${c.column_name}`;
				if (!have.has(c.column_name)) throw fail('column missing on dev');
			}
			for (const c of devCols[t]) {
				where = `${t}.${c.column_name}`;
				if (!prodNames.has(c.column_name) && c.is_nullable === 'NO' && c.column_default === null)
					throw fail('dev column required');
			}
			plan[t] = snap.cols[t].map((c) => c.column_name);
		}

		stage = 'save';
		where = '';
		const [mp] = await tx`select account_id from mp_connections where user_id = ${dev}`;
		const [gal] =
			await tx`select ars_account_id, usd_account_id from galicia_connections where user_id = ${dev}`;
		const [{ j: syncState }] = await tx`
			select coalesce(json_agg(t), '[]')::text as j from (
				select * from mp_sync_state where account_id in (select id from financial_accounts where owner_id = ${dev})
			) t`;
		const others = {};
		for (const [t] of TABLES) {
			where = t;
			const [r] = await tx.unsafe(
				`select count(*)::int as n from ${q(t)} where ${notScopeWhere(t, '$1')}`,
				[dev]
			);
			others[t] = r.n;
		}

		// Deleting must not SET NULL / cascade into other users' rows: check every FK into the copied tables.
		stage = 'guard';
		const fks = await tx`
			select cl.relname as ref_table, a.attname as ref_col, t.relname as target, ta.attname as target_col,
				array_length(c.conkey, 1) as n, c.confdeltype as del
			from pg_constraint c
			join pg_class cl on cl.oid = c.conrelid
			join pg_class t on t.oid = c.confrelid
			join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
			join pg_attribute ta on ta.attrelid = c.confrelid and ta.attnum = c.confkey[1]
			where c.contype = 'f' and cl.relnamespace = current_schema()::regnamespace
				and t.relnamespace = current_schema()::regnamespace
				and t.relname in ${tx(TABLES.map(([n]) => n))}`;
		const kept = []; // dev rows of kept tables whose ON DELETE SET NULL FK the delete would null
		const OWN = {
			mp_connections: '"user_id" = $1',
			gmail_connections: '"user_id" = $1',
			galicia_connections: '"user_id" = $1',
			mp_sync_state: 'account_id in (select id from financial_accounts where owner_id = $1)'
		};
		for (const f of fks) {
			where = `${f.ref_table}.${f.ref_col}`;
			if (f.n !== 1) throw fail('foreign reference composite');
			if (snap.absent.has(f.target)) continue; // nothing of it is deleted
			if (snap.absent.has(f.ref_table)) {
				const rows = await tx.unsafe(
					`select id, ${q(f.ref_col)} as v from ${q(f.ref_table)} where ${scopeWhere(f.ref_table, '$1')}
					 and ${q(f.ref_col)} in (select ${q(f.target_col)} from ${q(f.target)} where ${scopeWhere(f.target, '$1')})`,
					[dev]
				);
				if (rows.length && f.del !== 'n') throw fail('kept reference');
				for (const r of rows) kept.push({ id: r.id, v: r.v, f });
			}
			const own =
				OWN[f.ref_table] ||
				(TABLES.some(([n]) => n === f.ref_table) ? scopeWhere(f.ref_table, '$1') : null);
			if (!own) throw fail('foreign reference unknown table');
			const [{ n }] = await tx.unsafe(
				`select count(*)::int as n from ${q(f.ref_table)} where ${q(f.ref_col)} in
				 (select ${q(f.target_col)} from ${q(f.target)} where ${scopeWhere(f.target, '$1')}) and not (${own})`,
				[dev]
			);
			if (n) throw fail('foreign reference');
		}
		where = '';

		stage = 'delete';
		for (const [t] of [...TABLES].reverse()) {
			where = t;
			if (snap.absent.has(t)) continue;
			await tx.unsafe(`delete from ${q(t)} where ${scopeWhere(t, '$1')}`, [dev]);
		}

		stage = 'insert';
		for (const [t, s] of TABLES) {
			where = t;
			if (snap.absent.has(t)) continue;
			const list = plan[t].map(q).join(', ');
			const sel = plan[t].map((n) => (n === s ? '$2::text' : q(n))).join(', ');
			await tx.unsafe(
				`insert into ${q(t)} (${list}) select ${sel} from json_populate_recordset(null::${q(t)}, $1::text::json)`,
				s ? [snap.data[t], dev] : [snap.data[t]]
			);
		}

		stage = 'restore';
		const out = [];
		const mine = async (id) =>
			(await tx`select 1 from financial_accounts where id = ${id} and owner_id = ${dev}`).length >
			0;
		where = 'mp_connections.account_id';
		if (mp?.account_id) {
			if (await mine(mp.account_id))
				await tx`update mp_connections set account_id = ${mp.account_id} where user_id = ${dev}`;
			else out.push('dev-sync: mp_connections.account_id cleared');
		}
		for (const col of ['ars_account_id', 'usd_account_id']) {
			where = `galicia_connections.${col}`;
			if (!gal?.[col]) continue;
			if (await mine(gal[col]))
				await tx.unsafe(`update galicia_connections set ${q(col)} = $1 where user_id = $2`, [
					gal[col],
					dev
				]);
			else out.push(`dev-sync: galicia_connections.${col} cleared`);
		}
		const cleared = {};
		for (const { id, v, f } of kept) {
			const key = `${f.ref_table}.${f.ref_col}`;
			where = key;
			cleared[key] ??= 0;
			const res = await tx.unsafe(
				`update ${q(f.ref_table)} set ${q(f.ref_col)} = $1 where id = $2 and exists
				 (select 1 from ${q(f.target)} where ${q(f.target_col)} = $1 and ${scopeWhere(f.target, '$3')})`,
				[v, id, dev]
			);
			if (res.count === 0) cleared[key]++;
		}
		for (const [key, n] of Object.entries(cleared))
			if (n) out.push(`dev-sync: ${key} cleared ${n}`);
		where = 'mp_sync_state';
		await tx`insert into mp_sync_state
			select * from json_populate_recordset(null::mp_sync_state, ${syncState}::text::json)
			where account_id in (select id from financial_accounts where owner_id = ${dev})
			on conflict do nothing`;

		stage = 'verify';
		for (const [t] of TABLES) {
			where = t;
			const [{ n }] = await tx.unsafe(
				`select count(*)::int as n from ${q(t)} where ${scopeWhere(t, '$1')}`,
				[dev]
			);
			const prod = snap.absent.has(t) ? 'absent' : JSON.parse(snap.data[t]).length;
			if (prod !== 'absent' && n !== prod) throw fail('count mismatch');
			const [{ n: o }] = await tx.unsafe(
				`select count(*)::int as n from ${q(t)} where ${notScopeWhere(t, '$1')}`,
				[dev]
			);
			if (o !== others[t]) throw fail('other users changed');
			out.push(`dev-sync: ${t} prod=${prod} dev=${n}`);
		}
		for (const [t, col, target] of FKS) {
			where = `${t}.${col}`;
			const ts = scopeOf(target);
			const owned = ts ? `y.${q(ts)} = $1` : 'false';
			const [{ n }] = await tx.unsafe(
				`select count(*)::int as n from ${q(t)} x where ${scopeWhere(t, '$1')} and x.${q(col)} is not null
				 and not exists (select 1 from ${q(target)} y where y.id = x.${q(col)} and ${owned})`,
				[dev]
			);
			if (n) throw fail('foreign key outside user');
		}
		return out;
	});
	for (const l of logs) console.log(l);
	console.log(`dev-sync: ok ${Date.now() - t0}ms`);
} catch (err) {
	console.error(
		`dev-sync failed: ${stage}${where ? ` ${where}` : ''} ${err?.code || err?.name || 'error'}`
	);
	process.exitCode = 1;
} finally {
	await Promise.all([src.end({ timeout: 5 }), dst.end({ timeout: 5 })]).catch(() => {});
}
