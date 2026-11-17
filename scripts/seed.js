// Local demo data. Refuses to run against anything but a local database.
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import postgres from 'postgres';

const email = (process.env.SEED_EMAIL || 'demo@gastar.local').trim().toLowerCase();
const password = process.env.SEED_PASSWORD;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
	console.error('Refusing to seed: NODE_ENV=production');
	process.exit(1);
}
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];
let hostname;
try {
	hostname = new URL(databaseUrl).hostname;
} catch {
	console.error('Refusing to seed: DATABASE_URL is not a valid URL');
	process.exit(1);
}
if (process.env.SEED_ALLOW_REMOTE === '1') {
	console.warn(`WARNING: SEED_ALLOW_REMOTE=1, seeding non-local host "${hostname}"`);
} else if (!LOCAL_HOSTS.includes(hostname)) {
	console.error(`Refusing to seed: DATABASE_URL host "${hostname}" is not local`);
	process.exit(1);
}
// When set, seeds this already-existing user instead of creating the demo users.
const existingEmail = (process.env.SEED_EXISTING_USER || '').trim().toLowerCase();
if (!password && !existingEmail) {
	console.error('SEED_PASSWORD is not set: set it in .env (see .env.example) or the environment');
	process.exit(1);
}

// Deterministic PRNG (mulberry32) so output is reproducible.
let seed = 20240601;
function rand() {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const now = new Date();
let userId = randomUUID(); // replaced by the existing user's id when SEED_EXISTING_USER is set

const accountDefs = [
	// color and icon are keys from src/lib/appearance.ts (SWATCHES, ACCOUNT_ICONS), not hex
	{
		key: 'cash',
		name: 'Efectivo',
		currency: 'ARS',
		initial: 45_000_00,
		color: 'ochre',
		icon: 'cash'
	},
	{
		key: 'bank',
		name: 'Banco Galicia',
		currency: 'ARS',
		initial: 650_000_00,
		color: 'orange',
		icon: 'bank'
	},
	{
		key: 'mp',
		name: 'Mercado Pago',
		currency: 'ARS',
		initial: 120_000_00,
		color: 'blue',
		icon: 'phone'
	},
	{
		key: 'usd',
		name: 'Ahorro USD',
		currency: 'USD',
		initial: 1_800_00,
		color: 'green',
		icon: 'dollar'
	},
	{
		key: 'old',
		name: 'Cuenta Santander (cerrada)',
		currency: 'ARS',
		initial: 0,
		color: 'teal',
		icon: 'bank',
		archived: true
	}
];
const categoryDefs = [
	{ key: 'super', name: 'Supermercado', color: 'orange', icon: 'cart', kind: 'outcome' },
	{ key: 'rent', name: 'Alquiler', color: 'violet', icon: 'home', kind: 'outcome' },
	{ key: 'bills', name: 'Servicios', color: 'blue', icon: 'services', kind: 'outcome' },
	{ key: 'transport', name: 'Transporte', color: 'ochre', icon: 'transport', kind: 'outcome' },
	{ key: 'out', name: 'Salidas', color: 'plum', icon: 'entertainment', kind: 'outcome' },
	{ key: 'health', name: 'Salud', color: 'green', icon: 'health', kind: 'outcome' },
	{ key: 'salary', name: 'Sueldo', color: 'teal', icon: 'salary', kind: 'income' },
	{ key: 'freelance', name: 'Freelance', color: 'blue', icon: 'salary', kind: 'income' },
	{ key: 'gifts', name: 'Regalos', color: 'red', icon: 'gift' },
	{
		key: 'gym',
		name: 'Gimnasio (viejo)',
		color: 'violet',
		icon: 'health',
		kind: 'outcome',
		archived: true
	}
];
const acc = Object.fromEntries(accountDefs.map((a) => [a.key, { ...a, id: randomUUID() }]));
const cat = Object.fromEntries(categoryDefs.map((c) => [c.key, { ...c, id: randomUUID() }]));

const rentRule = randomUUID();
const gymRule = randomUUID();

const movements = [];
const today = now.getDate();
// Random day in [lo, hi]; the current month only draws from 1..today so nothing piles up on today.
const rday = (m, lo = 1, hi = 28) => {
	const h = m === 0 ? Math.min(hi, today) : hi;
	return between(m === 0 ? 1 : lo, h);
};
// Buenos Aires local midnight of the date's Buenos Aires day (movements are date-only).
const BA = 'America/Argentina/Buenos_Aires';
function dayStartBA(d) {
	const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: BA }).format(d);
	const offset = new Intl.DateTimeFormat('en-US', { timeZone: BA, timeZoneName: 'longOffset' })
		.formatToParts(d)
		.find((p) => p.type === 'timeZoneName')
		.value.slice(3);
	return new Date(`${ymd}T00:00:00${offset}`);
}

// Local-time date in `monthsAgo` months back; future dates are clamped to now, never dropped.
function add(monthsAgo, day, hour, row) {
	let occurredAt = new Date(
		now.getFullYear(),
		now.getMonth() - monthsAgo,
		day,
		hour,
		between(0, 59)
	);
	if (occurredAt > now) occurredAt = new Date(now);
	occurredAt = dayStartBA(occurredAt);
	movements.push({
		id: randomUUID(),
		user_id: userId,
		monthsAgo,
		type: 'outcome',
		occurred_at: occurredAt,
		category_id: null,
		destination_account_id: null,
		destination_amount: null,
		exchange_rate: null,
		recurring_id: null,
		...row
	});
}
const outcome = (m, d, h, desc, a, c, amountPesos) =>
	add(m, d, h, {
		type: 'outcome',
		description: desc,
		account_id: acc[a].id,
		category_id: cat[c].id,
		amount: amountPesos * 100
	});
const income = (m, d, h, desc, a, c, amountCents) =>
	add(m, d, h, {
		type: 'income',
		description: desc,
		account_id: acc[a].id,
		category_id: cat[c].id,
		amount: amountCents
	});

const shops = ['Coto', 'Carrefour', 'Dia', 'Verdulería', 'Carnicería', 'Panadería'];
const outings = ['Cena con amigos', 'Cafe', 'Cine', 'Birra', 'Delivery', 'Heladería'];

for (let m = 2; m >= 0; m--) {
	income(m, 5, 10, 'Sueldo', 'bank', 'salary', 1_250_000_00 + (2 - m) * 50_000_00);
	outcome(m, 3, 9, 'Alquiler', 'bank', 'rent', 380_000);
	outcome(m, 8, 11, 'Luz', 'bank', 'bills', between(18, 32) * 1000);
	outcome(m, 9, 11, 'Internet', 'bank', 'bills', 28_500);
	outcome(m, 10, 12, 'Gas', 'mp', 'bills', between(9, 22) * 1000);
	outcome(m, 12, 12, 'Celular', 'mp', 'bills', 15_000);
	for (let i = 0; i < 6; i++) {
		const a = pick(['bank', 'mp', 'cash']);
		outcome(m, rday(m), between(9, 20), pick(shops), a, 'super', between(6, 55) * 1000);
	}
	for (let i = 0; i < 8; i++) {
		outcome(
			m,
			rday(m),
			between(7, 19),
			pick(['SUBE', 'Uber', 'Nafta']),
			pick(['mp', 'cash']),
			'transport',
			between(15, 80) * 100
		);
	}
	for (let i = 0; i < 5; i++) {
		outcome(
			m,
			rday(m),
			between(12, 23),
			pick(outings),
			pick(['mp', 'cash', 'bank']),
			'out',
			between(35, 180) * 100
		);
	}
	outcome(m, rday(m, 10, 25), 16, 'Farmacia', 'mp', 'health', between(8, 40) * 1000);
	if (m === 1) outcome(m, 18, 17, 'Consulta médica', 'bank', 'health', 45_000);
	if (m === 2) outcome(m, 14, 19, 'Regalo cumpleaños', 'bank', 'gifts', 32_000);
	if (m === 2) outcome(m, 2, 10, 'Gimnasio', 'old', 'gym', 22_000);
	income(
		m,
		rday(m, 14, 24),
		15,
		'Proyecto freelance',
		'bank',
		'freelance',
		between(120, 300) * 1000 * 100
	);
	if (m !== 1) income(m, 20, 18, 'Cliente exterior', 'usd', 'freelance', between(200, 450) * 100);

	// ARS -> ARS (same currency): dest amount = amount, no rate.
	const atm = between(40, 80) * 1000 * 100;
	add(m, 6, 14, {
		type: 'transfer',
		description: 'Retiro cajero',
		account_id: acc.bank.id,
		destination_account_id: acc.cash.id,
		amount: atm,
		destination_amount: atm
	});
	add(m, 7, 15, {
		type: 'transfer',
		description: 'Carga Mercado Pago',
		account_id: acc.bank.id,
		destination_account_id: acc.mp.id,
		amount: 100_000_00,
		destination_amount: 100_000_00
	});
	// ARS -> USD: dest = round_half_up(amount * 100 / rate_hundredths).
	const rate = 120_000 + (2 - m) * 6_500 + between(0, 20) * 100;
	const ars = between(100, 200) * 1000 * 100;
	add(m, 11, 13, {
		type: 'transfer',
		description: 'Compra de dólares',
		account_id: acc.bank.id,
		destination_account_id: acc.usd.id,
		amount: ars,
		destination_amount: Math.floor((ars * 200 + rate) / (2 * rate)),
		exchange_rate: rate
	});
}
for (const mv of movements) if (mv.description === 'Alquiler') mv.recurring_id = rentRule;

// Legacy non-midnight row (23:30 Buenos Aires on the 14th) for the date-only e2e; normalized by migration 0001.
movements.push({
	id: randomUUID(),
	user_id: userId,
	type: 'outcome',
	occurred_at: new Date('2025-03-15T02:30:00Z'),
	description: 'Legado fin del día',
	account_id: acc.bank.id,
	category_id: cat.super.id,
	amount: 1_000_00,
	destination_account_id: null,
	destination_amount: null,
	exchange_rate: null,
	recurring_id: null
});

const cols = [
	'id',
	'user_id',
	'type',
	'occurred_at',
	'description',
	'amount',
	'account_id',
	'category_id',
	'destination_account_id',
	'destination_amount',
	'exchange_rate',
	'recurring_id'
];

// Removes a user's app data (not the auth rows), children before parents.
async function deleteAppData(tx, id) {
	await tx`delete from movements where user_id = ${id}`;
	await tx`delete from plan_category_limits where plan_id in (select id from spending_plans where user_id = ${id})`;
	await tx`delete from spending_plans where user_id = ${id}`;
	await tx`delete from recurring_movements where user_id = ${id}`;
	await tx`delete from categories where user_id = ${id}`;
	await tx`delete from galicia_connections where user_id = ${id}`;
	await tx`delete from mp_import_items where user_id = ${id}`;
	await tx`delete from mp_import_rules where user_id = ${id}`;
	await tx`delete from mp_sync_state where account_id in (select id from financial_accounts where owner_id = ${id})`;
	await tx`delete from financial_accounts where owner_id = ${id}`;
}

async function deleteUserData(tx, id) {
	await deleteAppData(tx, id);
	await tx`delete from session where user_id = ${id}`;
	await tx`delete from "account" where user_id = ${id}`;
	await tx`delete from "user" where id = ${id}`;
}

const sql = postgres(databaseUrl, { max: 1 });

try {
	const passwordHash = existingEmail ? null : await hashPassword(password);
	await sql.begin(async (tx) => {
		if (existingEmail) {
			const [found] = await tx`select id from "user" where email = ${existingEmail}`;
			if (!found) throw new Error(`SEED_EXISTING_USER: no user with email "${existingEmail}"`);
			userId = found.id;
			for (const mv of movements) mv.user_id = userId;
			await deleteAppData(tx, userId);
		} else {
			const [existing] = await tx`select id from "user" where email = ${email}`;
			if (existing) await deleteUserData(tx, existing.id);
			await tx`
				insert into "user" (id, name, email, email_verified, created_at, updated_at)
				values (${userId}, 'Demo', ${email}, true, now(), now())
			`;
			await tx`
				insert into "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
				values (${randomUUID()}, ${userId}, 'credential', ${userId}, ${passwordHash}, now(), now())
			`;
		}
		await tx`insert into financial_accounts ${tx(
			Object.values(acc).map((a) => ({
				id: a.id,
				owner_id: userId,
				name: a.name,
				currency: a.currency,
				initial_balance: a.initial,
				icon: a.icon,
				color: a.color,
				archived_at: a.archived ? now : null
			}))
		)}`;
		await tx`insert into categories ${tx(
			Object.values(cat).map((c) => ({
				id: c.id,
				user_id: userId,
				name: c.name,
				color: c.color,
				icon: c.icon ?? null,
				kind: c.kind ?? null,
				archived_at: c.archived ? now : null
			}))
		)}`;
		await tx`insert into recurring_movements ${tx([
			{
				id: rentRule,
				user_id: userId,
				type: 'outcome',
				description: 'Alquiler',
				amount: 380_000_00,
				account_id: acc.bank.id,
				category_id: cat.rent.id,
				day_of_month: 3,
				archived_at: null // postgres.js multi-row insert takes columns from the first row
			},
			{
				id: gymRule,
				user_id: userId,
				type: 'outcome',
				description: 'Gimnasio',
				amount: 22_000_00,
				account_id: acc.old.id,
				category_id: cat.gym.id,
				day_of_month: 2,
				archived_at: null
			},
			{
				id: randomUUID(),
				user_id: userId,
				type: 'income',
				description: 'Sueldo',
				amount: 1_500_000_00,
				account_id: acc.bank.id,
				category_id: cat.salary.id,
				day_of_month: 5,
				archived_at: null
			},
			{
				id: randomUUID(),
				user_id: userId,
				type: 'outcome',
				description: 'Spotify',
				amount: 10_99,
				account_id: acc.usd.id,
				category_id: cat.bills.id,
				day_of_month: 20,
				archived_at: null
			},
			{
				id: randomUUID(),
				user_id: userId,
				type: 'outcome',
				description: 'Netflix',
				amount: 12_000_00,
				account_id: acc.mp.id,
				category_id: cat.bills.id,
				day_of_month: 15,
				archived_at: now // paused rule
			}
		])}`;
		await tx`insert into movements ${tx(movements, ...cols)}`;

		// Demo ARS plan: repeats every month. Salidas limit sits under current-month spending (over),
		// Transporte limit just above it (near); both rounded to whole thousands of pesos.
		const spent = (key) =>
			movements
				.filter((x) => x.monthsAgo === 0 && x.type === 'outcome' && x.category_id === cat[key].id)
				.reduce((sum, x) => sum + x.amount, 0);
		const THOUSAND = 1_000_00;
		const outLimit = Math.max(1, Math.floor((spent('out') * 0.7) / THOUSAND)) * THOUSAND;
		const transportLimit = Math.max(1, Math.round(spent('transport') / 0.88 / THOUSAND)) * THOUSAND;
		const planId = randomUUID();
		await tx`
			insert into spending_plans (id, user_id, currency, savings, month)
			values (${planId}, ${userId}, 'ARS', ${150_000_00}, null)
		`;
		await tx`
			insert into plan_category_limits (plan_id, category_id, amount)
			values (${planId}, ${cat.super.id}, ${300_000_00}),
				(${planId}, ${cat.out.id}, ${outLimit}),
				(${planId}, ${cat.transport.id}, ${transportLimit})
		`;

		if (existingEmail) return;

		// Second user with USD data of its own, for the cross-user (foreign id) e2e tests.
		const otherEmail = 'otro@gastar.local';
		const [other] = await tx`select id from "user" where email = ${otherEmail}`;
		if (other) await deleteUserData(tx, other.id);
		const otherId = randomUUID();
		const otherAccountId = randomUUID();
		const otherCategoryId = randomUUID();
		await tx`
			insert into "user" (id, name, email, email_verified, created_at, updated_at)
			values (${otherId}, 'Otro', ${otherEmail}, true, now(), now())
		`;
		await tx`
			insert into "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
			values (${randomUUID()}, ${otherId}, 'credential', ${otherId}, ${passwordHash}, now(), now())
		`;
		await tx`
			insert into financial_accounts (id, owner_id, name, currency, initial_balance, icon, color)
			values (${otherAccountId}, ${otherId}, 'Otra cuenta', 'USD', ${500_00}, 'dollar', 'green')
		`;
		await tx`
			insert into financial_accounts (id, owner_id, name, currency, initial_balance, icon, color)
			values (${randomUUID()}, ${otherId}, 'Otra cuenta pesos', 'ARS', ${500_000_00}, 'bank', 'teal')
		`;
		await tx`
			insert into categories (id, user_id, name, color)
			values (${otherCategoryId}, ${otherId}, 'Ajena', 'blue')
		`;
		await tx`
			insert into recurring_movements (id, user_id, type, description, amount, account_id, category_id, day_of_month)
			values (${randomUUID()}, ${otherId}, 'outcome', 'Regla ajena', ${50_00}, ${otherAccountId}, ${otherCategoryId}, 10)
		`;

		// Third user owning the Mercado Pago account the E2E links through the UI (fixed id kept stable across seeds).
		const importEmail = 'importa@gastar.local';
		const [importer] = await tx`select id from "user" where email = ${importEmail}`;
		if (importer) await deleteUserData(tx, importer.id);
		const importerId = randomUUID();
		await tx`
			insert into "user" (id, name, email, email_verified, created_at, updated_at)
			values (${importerId}, 'Importa', ${importEmail}, true, now(), now())
		`;
		await tx`
			insert into "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
			values (${randomUUID()}, ${importerId}, 'credential', ${importerId}, ${passwordHash}, now(), now())
		`;
		await tx`
			insert into financial_accounts (id, owner_id, name, currency, initial_balance, icon, color)
			values ('00000000-0000-4000-8000-00000000a001', ${importerId}, 'Mercado Pago', 'ARS', ${50_000_00}, 'phone', 'blue')
		`;

		// Fourth user for the Banco Galicia statement E2E: one pesos and one dollar account, no connection yet.
		const galiciaEmail = 'galicia@gastar.local';
		const [cardholder] = await tx`select id from "user" where email = ${galiciaEmail}`;
		if (cardholder) await deleteUserData(tx, cardholder.id);
		const cardholderId = randomUUID();
		await tx`
			insert into "user" (id, name, email, email_verified, created_at, updated_at)
			values (${cardholderId}, 'Galicia', ${galiciaEmail}, true, now(), now())
		`;
		await tx`
			insert into "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
			values (${randomUUID()}, ${cardholderId}, 'credential', ${cardholderId}, ${passwordHash}, now(), now())
		`;
		await tx`
			insert into financial_accounts (id, owner_id, name, currency, initial_balance, icon, color)
			values (${randomUUID()}, ${cardholderId}, 'Caja pesos', 'ARS', ${1_000_000_00}, 'bank', 'blue'),
				(${randomUUID()}, ${cardholderId}, 'Caja dólares', 'USD', ${5_000_00}, 'dollar', 'green')
		`;

		// Fifth and sixth users for the Gmail Visa alert E2E: A has pesos and dollar accounts and an expense category, B a pesos account.
		for (const [alertEmail, name, accounts] of [
			[
				'alertas@gastar.local',
				'Alertas A',
				[
					['Pesos Visa A', 'ARS', 'bank', 'blue'],
					['Dolares Visa A', 'USD', 'dollar', 'green']
				]
			],
			['alertas-b@gastar.local', 'Alertas B', [['Pesos Visa B', 'ARS', 'bank', 'blue']]]
		]) {
			const [old] = await tx`select id from "user" where email = ${alertEmail}`;
			if (old) await deleteUserData(tx, old.id);
			const alertId = randomUUID();
			await tx`
				insert into "user" (id, name, email, email_verified, created_at, updated_at)
				values (${alertId}, ${name}, ${alertEmail}, true, now(), now())
			`;
			await tx`
				insert into "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
				values (${randomUUID()}, ${alertId}, 'credential', ${alertId}, ${passwordHash}, now(), now())
			`;
			for (const [accountName, currency, icon, color] of accounts) {
				await tx`
					insert into financial_accounts (id, owner_id, name, currency, initial_balance, icon, color)
					values (${randomUUID()}, ${alertId}, ${accountName}, ${currency}, ${1_000_000_00}, ${icon}, ${color})
				`;
			}
			if (alertEmail === 'alertas@gastar.local') {
				await tx`
					insert into categories (id, user_id, name, kind, color)
					values (${randomUUID()}, ${alertId}, 'Compras Visa', 'outcome', 'blue')
				`;
			}
		}
	});

	const n = (t) => movements.filter((x) => x.type === t).length;
	console.log(
		`Seeded ${Object.keys(acc).length} accounts, ${Object.keys(cat).length} categories, ${movements.length} movements ` +
			`(${n('income')} income, ${n('outcome')} outcome, ${n('transfer')} transfer).`
	);
	if (existingEmail) console.log(`Seeded existing user ${existingEmail} (login unchanged).`);
	else console.log(`Login: ${email} / ${password} (dev only)`);
} catch (err) {
	console.error('Failed to seed:', err.message);
	process.exitCode = 1;
} finally {
	await sql.end();
}
