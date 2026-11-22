import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { statementOf } from './galicia-pdf';
import {
	ALERTS_B_EMAIL,
	ALERTS_EMAIL,
	fakeAlert as alert,
	gmailSync as sync,
	linkGmail,
	login,
	openItem,
	pick,
	pickDate,
	reviewDrawer,
	upload,
	withDb,
	gotoHydrated
} from './helpers';
import { arDaysAgo } from './fakes.js';

// Gmail is the fake in e2e/fake-gmail.js. Two seeded users (used by no other spec) with their own mailboxes (the consent answers for the
// `login_hint` this spec adds to the authorize URL, so it never shares /__fake/account with gmail-link.e2e.ts,
// and it never calls the global reset). beforeAll clears the users' Gmail-import state, so reruns on a reused
// DB start clean and merchants and cards need no stamps.
const stamp = Date.now();
const A = {
	email: ALERTS_EMAIL,
	mailbox: `alerts-a-${stamp}@gastar.local`
};
const B = {
	email: ALERTS_B_EMAIL,
	mailbox: `alerts-b-${stamp}@gastar.local`
};

test.describe.configure({ mode: 'serial' });

let ctxA: BrowserContext;
let ctxB: BrowserContext;
let pageA: Page;
let pageB: Page;

/** Visa Débito items of a user, with the account each landed on. */
const items = (email: string) =>
	withDb(
		(sql) => sql`
			select i.merchant, i.amount::int as amount, i.status, i.kind, a.name as account,
				i.auto_approved_at is not null as auto
			from mp_import_items i join financial_accounts a on a.id = i.account_id
			where i.source = 'visa_debit' and i.user_id = (select id from "user" where email = ${email})
			order by i.merchant, i.amount`
	);

/** Waits (reloading) until user A's inbox lists an item with this merchant. */
const expectInInbox = (merchant: string) =>
	expect(async () => {
		await pageA.goto('/imports');
		await expect(pageA.getByText(merchant)).toBeVisible();
	}).toPass({ timeout: 15_000 });

/** Answers the "Tarjeta Visa ••NNNN: elegí qué es" row of /imports: debit with a pesos account (and a dollar one). */
async function setUpDebit(page: Page, last4: string, pesos: string, dollars?: string) {
	await page.goto('/imports');
	// Opens the row's link with a full load (not a client-side click), then waits for hydration.
	const href = await page
		.getByRole('link', { name: `Tarjeta Visa ••${last4}: elegí qué es` })
		.getAttribute('href');
	await gotoHydrated(page, href!);
	await page.getByRole('radio', { name: 'Débito' }).check({ force: true });
	await pick(page, 'Cuenta en pesos', pesos);
	if (dollars) await pick(page, 'Cuenta en dólares', dollars);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/imports$/);
}

/** Removes what an earlier run left of these users' Gmail import: alerts, cards, visa_debit and galicia_mastercard items with their movements, rules and the link. */
const SOURCES = ['visa_debit', 'galicia_mastercard'];

function resetGmailState(emails: string[]) {
	return withDb(async (sql) => {
		const ids = (await sql`select id from "user" where email in ${sql(emails)}`).map((u) => u.id);
		await sql`delete from movements where id in (
			select movement_id from mp_import_items
			where source in ${sql(SOURCES)} and movement_id is not null and user_id in ${sql(ids)})`;
		await sql`delete from card_alerts where user_id in ${sql(ids)}`;
		await sql`delete from card_statements where user_id in ${sql(ids)}`;
		await sql`delete from recurring_movements where ends_month is not null and user_id in ${sql(ids)}`;
		await sql`delete from import_cards where user_id in ${sql(ids)}`;
		await sql`delete from mp_import_items where source in ${sql(SOURCES)} and user_id in ${sql(ids)}`;
		await sql`delete from mp_import_rules where user_id in ${sql(ids)}`;
		await sql`delete from gmail_connections where user_id in ${sql(ids)}`;
		await sql`delete from import_settings where user_id in ${sql(ids)}`;
	});
}

test.beforeAll(async ({ browser, baseURL }) => {
	ctxA = await browser.newContext({ baseURL });
	ctxB = await browser.newContext({ baseURL });
	pageA = await ctxA.newPage();
	pageB = await ctxB.newPage();
	await resetGmailState([A.email, B.email]);
	await login(pageA, A.email);
	await login(pageB, B.email);
	await linkGmail(pageA, baseURL!, A.mailbox);
	await linkGmail(pageB, baseURL!, B.mailbox);
});

test.afterAll(async () => {
	await ctxA.close();
	await ctxB.close();
});

test('an alert of an unknown card creates no item until the card is set up', async ({
	baseURL
}) => {
	await alert(A.mailbox, { merchant: 'LIBRERIA EJEMPLO', amount: '2500.00' });
	await sync(pageA, baseURL!);
	expect(await items(A.email)).toEqual([]);
	await pageA.goto('/imports');
	await expect(
		pageA.getByRole('link', { name: 'Tarjeta Visa ••5678: elegí qué es' })
	).toBeVisible();

	await setUpDebit(pageA, '5678', 'Pesos Visa A', 'Dolares Visa A');
	expect(await items(A.email)).toEqual([
		{
			merchant: 'LIBRERIA EJEMPLO',
			amount: 250000,
			status: 'pending',
			kind: 'card_purchase',
			account: 'Pesos Visa A',
			auto: false
		}
	]);
});

test('debit alerts in pesos and dollars land on the right accounts and a second sync adds nothing', async ({
	baseURL
}) => {
	await alert(A.mailbox, { merchant: 'TIENDA ARS', amount: '12345.67' });
	await alert(A.mailbox, {
		merchant: 'TIENDA USD',
		amount: '9.99',
		currency: 'USD',
		foreign: true
	});
	await alert(A.mailbox, {
		merchant: 'SUSCRIPCION EXTERIOR',
		amount: '4499.00',
		currency: 'ARS',
		foreign: true
	});
	await sync(pageA, baseURL!);
	const expected = [
		{ merchant: 'LIBRERIA EJEMPLO', amount: 250000, account: 'Pesos Visa A', status: 'pending' },
		{
			merchant: 'SUSCRIPCION EXTERIOR',
			amount: 449900,
			account: 'Pesos Visa A',
			status: 'pending'
		},
		{ merchant: 'TIENDA ARS', amount: 1234567, account: 'Pesos Visa A', status: 'pending' },
		{ merchant: 'TIENDA USD', amount: 999, account: 'Dolares Visa A', status: 'pending' }
	];
	const rows = async () =>
		(await items(A.email)).map(({ merchant, amount, account, status }) => ({
			merchant,
			amount,
			account,
			status
		}));
	expect(await rows()).toEqual(expected);

	await sync(pageA, baseURL!);
	expect(await rows()).toEqual(expected);
});

test('an email that fails the DKIM check creates nothing', async ({ baseURL }) => {
	await alert(A.mailbox, { merchant: 'FALSA EJEMPLO', amount: '100.00', dkim: 'fail' });
	await sync(pageA, baseURL!);
	expect((await items(A.email)).map((i) => i.merchant)).not.toContain('FALSA EJEMPLO');
	const stored = await withDb(
		(sql) => sql`select count(*)::int as n from card_alerts where merchant = 'FALSA EJEMPLO'`
	);
	expect(stored[0].n).toBe(0);
});

test('a Galicia Mastercard alert becomes a pending credit item; an installment one becomes its first cuota; a reversed pair waits', async ({
	baseURL
}) => {
	await alert(A.mailbox, {
		merchant: 'FERRETERIA MC',
		amount: '1.234,56',
		last4: '3300',
		mastercard: { cuotas: '01' }
	});
	await alert(A.mailbox, {
		merchant: 'HELADERA MC',
		amount: '300.000,00',
		last4: '3300',
		mastercard: { cuotas: '03' }
	});
	// A pre-authorization and its reversal in the same sync cancel each other.
	for (const type of ['COMPRA', 'COMPRA REVERSADA']) {
		await alert(A.mailbox, {
			merchant: 'VIAJE MC',
			amount: '100,00',
			last4: '3300',
			type,
			mastercard: { cuotas: '01' }
		});
	}
	await sync(pageA, baseURL!);

	await pageA.goto('/imports');
	const href = await pageA
		.getByRole('link', { name: 'Tarjeta Mastercard ••3300: elegí qué es' })
		.getAttribute('href');
	await gotoHydrated(pageA, href!);
	await pick(pageA, 'Cuenta en pesos', 'Pesos Visa A');
	await pageA.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(pageA).toHaveURL(/\/imports$/);

	const state = await withDb(
		(sql) => sql`
			select c.merchant, c.transaction_type as type, c.installments, i.source, i.amount::int as amount, i.status,
				a.name as account
			from card_alerts c
			left join mp_import_items i on i.id = c.import_item_id
			left join financial_accounts a on a.id = i.account_id
			where c.network = 'mastercard' and c.user_id = (select id from "user" where email = ${A.email})
			order by c.merchant, c.transaction_type`
	);
	expect(state).toEqual([
		{
			merchant: 'FERRETERIA MC',
			type: 'Compra',
			installments: 1,
			source: 'galicia_mastercard',
			amount: 123456,
			status: 'pending',
			account: 'Pesos Visa A'
		},
		{
			merchant: 'HELADERA MC',
			type: 'Compra',
			installments: 3,
			source: 'galicia_mastercard',
			// The first cuota of the 300.000,00 total in 3 cuotas.
			amount: 30_000_000 / 3,
			status: 'pending',
			account: 'Pesos Visa A'
		},
		...['Compra', 'Compra reversada'].map((type) => ({
			merchant: 'VIAJE MC',
			type,
			installments: 1,
			source: null,
			amount: null,
			status: null,
			account: null
		}))
	]);
});

test('a Mastercard purchase in 3 cuotas becomes a fixed payment for 3 months and its statement cuotas are not duplicated', async () => {
	const TZ = 'America/Argentina/Buenos_Aires';
	await openItem(pageA, 'HELADERA MC');
	await expect(reviewDrawer(pageA).getByText(/3 cuotas de/)).toBeVisible();
	await pick(pageA, 'Categoría', 'Compras Visa');
	await reviewDrawer(pageA).getByRole('button', { name: 'Aprobar', exact: true }).click();
	await expect(reviewDrawer(pageA)).toHaveCount(0);

	const [rule] = await withDb(
		(sql) => sql`
			select r.id, r.amount::int as amount, r.ends_month,
				to_char((i.occurred_at at time zone ${TZ}) + interval '2 months', 'YYYY-MM') as expected_end,
				to_char(i.occurred_at at time zone ${TZ}, 'YYYY-MM-DD') as day,
				(select count(*)::int from movements m where m.recurring_id = r.id) as linked
			from recurring_movements r join mp_import_items i on i.recurring_id = r.id
			where i.merchant = 'HELADERA MC' and r.user_id = (select id from "user" where email = ${A.email})`
	);
	expect(rule).toMatchObject({ amount: 30_000_000 / 3, linked: 1 });
	expect(rule.ends_month).toBe(rule.expected_end);

	// The statement of the next month: the 01/03 line is the purchase already imported, 02/03 its second cuota.
	const [y, m, d] = (rule.day as string).split('-').map(Number);
	const two = (n: number) => String(n).padStart(2, '0');
	const next = new Date(Date.UTC(y, m, 15));
	const line = (cuota: string) => ({
		date: `${two(d)}-${two(m)}-${String(y).slice(2)}`,
		reference: 'HELADERA MC',
		cuota,
		voucher: '000777',
		ars: '100.000,00'
	});
	await upload(
		pageA,
		statementOf({
			network: 'MASTERCARD',
			number: 'MC-TARJETA-001',
			closing: `15-${two(next.getUTCMonth() + 1)}-${String(next.getUTCFullYear()).slice(2)}`,
			lines: [line('01/03'), line('02/03')]
		})
	);
	await expect(pageA).toHaveURL(/\/imports/);

	// The 01/03 line anchors the last month to the closing: closing month + 2.
	const closingDay = next.toISOString().slice(0, 10);
	const [moved] = await withDb(
		(sql) => sql`
			select ends_month, to_char(${closingDay}::date + interval '2 months', 'YYYY-MM') as expected
			from recurring_movements where id = ${rule.id}`
	);
	expect(moved.ends_month).toBe(moved.expected);

	const rows = await withDb(
		(sql) => sql`
			select i.external_key as key, i.kind, i.status, i.auto_approved_at is not null as auto, m.recurring_id
			from mp_import_items i left join movements m on m.id = i.movement_id
			where i.merchant = 'HELADERA MC' and i.user_id = (select id from "user" where email = ${A.email})`
	);
	expect(rows.filter((r) => r.kind === 'card_adjustment')).toEqual([]);
	expect(rows.some((r) => r.key.includes(':01/03:'))).toBe(false);
	const second = rows.find((r) => r.key.includes(':02/03:'))!;
	expect(second).toMatchObject({ status: 'approved', auto: true, recurring_id: rule.id });

	const [after] = await withDb(
		(sql) => sql`
			select r.amount::int as amount, (select count(*)::int from movements m where m.recurring_id = r.id) as linked
			from recurring_movements r where r.id = ${rule.id}`
	);
	expect(after).toEqual({ amount: 30_000_000 / 3, linked: 2 });

	await pageA.goto(`/plan/recurring/${rule.id}`);
	await expect(pageA.getByText('Última cuota')).toBeVisible();
	// Not asserted: the rule leaving the plan after its last month ("Terminado"). It is decided against the
	// current month, so the plan's ?month= does not show it without moving the clock.
});

test('a learned merchant rule auto-approves the next debit alert of that merchant', async ({
	baseURL
}) => {
	await alert(A.mailbox, { merchant: 'KIOSCO EJEMPLOxxxx', amount: '500.00' });
	await sync(pageA, baseURL!);
	await openItem(pageA, 'KIOSCO EJEMPLO');
	await pick(pageA, 'Categoría', 'Compras Visa');
	await pageA.getByRole('checkbox', { name: 'Recordar para la próxima' }).check();
	await reviewDrawer(pageA).getByRole('button', { name: 'Aprobar', exact: true }).click();
	await expect(reviewDrawer(pageA)).toHaveCount(0);

	await alert(A.mailbox, { merchant: 'KIOSCO EJEMPLOxxxx', amount: '600.00' });
	await sync(pageA, baseURL!);
	const kiosco = (await items(A.email)).filter((i) => i.merchant === 'KIOSCO EJEMPLOxxxx');
	expect(kiosco.map(({ amount, status, auto }) => ({ amount, status, auto }))).toEqual([
		{ amount: 50000, status: 'approved', auto: false },
		{ amount: 60000, status: 'approved', auto: true }
	]);
});

test("a user's sync never writes to another user", async ({ baseURL }) => {
	await alert(B.mailbox, { merchant: 'TIENDA DE B', amount: '77.00' });
	await sync(pageB, baseURL!);
	await setUpDebit(pageB, '5678', 'Pesos Visa B');
	// Same card number as user A's: only B's own alert can reach B.
	await alert(A.mailbox, { merchant: 'SOLO DE A', amount: '88.00' });
	await sync(pageA, baseURL!);

	const mine = (await items(A.email)).map((i) => i.merchant);
	const theirs = (await items(B.email)).map((i) => i.merchant);
	expect(mine).toContain('SOLO DE A');
	expect(mine).not.toContain('TIENDA DE B');
	expect(theirs).toEqual(['TIENDA DE B']);

	await sync(pageB, baseURL!);
	expect((await items(B.email)).map((i) => i.merchant)).toEqual(['TIENDA DE B']);
});

test('moving "Importar desde" earlier backfills Gmail alerts from before the cursor', async ({
	baseURL
}) => {
	// Listed at its own date, 40 days back: before the cursor, so a normal sync never reads it.
	await alert(A.mailbox, {
		merchant: 'ANTERIOR EJEMPLO',
		amount: '321.00',
		date: `${arDaysAgo(40)}T15:00:00Z`,
		listedAtDate: true
	});
	await sync(pageA, baseURL!);
	expect((await items(A.email)).map((i) => i.merchant)).not.toContain('ANTERIOR EJEMPLO');

	await gotoHydrated(pageA, '/profile/vinculaciones');
	await pickDate(pageA, 'Importar desde', arDaysAgo(60));
	await expect(pageA.getByText('Cambio guardado.')).toBeVisible();

	await expectInInbox('ANTERIOR EJEMPLO');
});

test('a normal sync reads alerts between the Importar desde day and an older cursor', async ({
	baseURL
}) => {
	await alert(A.mailbox, {
		merchant: 'INTERMEDIA EJEMPLO',
		amount: '654.00',
		date: `${arDaysAgo(50)}T15:00:00Z`,
		listedAtDate: true
	});
	// The state of a migrated user: the day copied from the old setting, the cursor at the link time, nothing covered.
	await withDb(async (sql) => {
		const [{ id }] = await sql`select id from "user" where email = ${A.email}`;
		await sql`insert into import_settings (user_id, import_from) values (${id}, ${arDaysAgo(60)})
			on conflict (user_id) do update set import_from = excluded.import_from`;
		await sql`update gmail_connections set sync_cursor = now(), covered_from = null where user_id = ${id}`;
	});

	await sync(pageA, baseURL!);
	await expectInInbox('INTERMEDIA EJEMPLO');
});
