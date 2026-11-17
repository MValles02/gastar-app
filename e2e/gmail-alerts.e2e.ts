import { expect, test, type BrowserContext, type Page } from '@playwright/test';
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
	withDb
} from './helpers';

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

/** Answers the "Tarjeta Visa ••NNNN: elegí qué es" row of /imports: debit with a pesos account (and a dollar one). */
async function setUpDebit(page: Page, last4: string, pesos: string, dollars?: string) {
	await page.goto('/imports');
	// A full load (not a client-side click) so the hydration guard below waits for this page.
	const href = await page
		.getByRole('link', { name: `Tarjeta Visa ••${last4}: elegí qué es` })
		.getAttribute('href');
	await page.goto(href!, { waitUntil: 'networkidle' }); // hydration guard: the pickers need JavaScript
	await page.getByRole('radio', { name: 'Débito' }).check({ force: true });
	await pick(page, 'Cuenta en pesos', pesos);
	if (dollars) await pick(page, 'Cuenta en dólares', dollars);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/imports$/);
}

/** Removes what an earlier run left of these users' Gmail import: alerts, cards, visa_debit items with their movements, rules and the link. */
function resetGmailState(emails: string[]) {
	return withDb(async (sql) => {
		const ids = (await sql`select id from "user" where email in ${sql(emails)}`).map((u) => u.id);
		await sql`delete from movements where id in (
			select movement_id from mp_import_items
			where source = 'visa_debit' and movement_id is not null and user_id in ${sql(ids)})`;
		await sql`delete from card_alerts where user_id in ${sql(ids)}`;
		await sql`delete from import_cards where user_id in ${sql(ids)}`;
		await sql`delete from mp_import_items where source = 'visa_debit' and user_id in ${sql(ids)}`;
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
	await sync(pageA, baseURL!);
	const expected = [
		{ merchant: 'LIBRERIA EJEMPLO', amount: 250000, account: 'Pesos Visa A', status: 'pending' },
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
	const day = (n: number) =>
		new Date(Date.now() - 3 * 3_600_000 - n * 86_400_000).toISOString().slice(0, 10);
	const cursor = async () =>
		(
			await withDb(
				(sql) => sql`select sync_cursor from gmail_connections
					where user_id = (select id from "user" where email = ${A.email})`
			)
		)[0].sync_cursor as Date;

	// Listed at its own date, 40 days back: before the cursor, so a normal sync never reads it.
	await alert(A.mailbox, {
		merchant: 'ANTERIOR EJEMPLO',
		amount: '321.00',
		date: `${day(40)}T15:00:00Z`,
		listedAtDate: true
	});
	await sync(pageA, baseURL!);
	expect((await items(A.email)).map((i) => i.merchant)).not.toContain('ANTERIOR EJEMPLO');
	const before = await cursor();

	await pageA.goto('/profile/vinculaciones');
	await pageA.waitForLoadState('networkidle'); // hydration guard: the date picker is JS-only
	await pickDate(pageA, 'Importar desde', day(60));
	await expect(pageA.getByText('Cambio guardado.')).toBeVisible();

	await expect
		.poll(async () =>
			(await items(A.email))
				.filter((i) => i.merchant === 'ANTERIOR EJEMPLO')
				.map(({ merchant, amount, status, account }) => ({ merchant, amount, status, account }))
		)
		.toEqual([
			{ merchant: 'ANTERIOR EJEMPLO', amount: 32100, status: 'pending', account: 'Pesos Visa A' }
		]);
	expect((await cursor()).getTime()).toBeGreaterThanOrEqual(before.getTime());
});

test('a normal sync reads alerts between the Importar desde day and an older cursor', async ({
	baseURL
}) => {
	const day = (n: number) => new Date(Date.now() - 3 * 3_600_000 - n * 86_400_000);
	const state = async () =>
		(
			await withDb(
				(sql) => sql`select c.sync_cursor, c.covered_from, s.import_from
					from gmail_connections c join import_settings s using (user_id)
					where c.user_id = (select id from "user" where email = ${A.email})`
			)
		)[0];

	await alert(A.mailbox, {
		merchant: 'INTERMEDIA EJEMPLO',
		amount: '654.00',
		date: `${day(50).toISOString().slice(0, 10)}T15:00:00Z`,
		listedAtDate: true
	});
	// The state of a migrated user: the day copied from the old setting, the cursor at the link time, nothing covered.
	await withDb(async (sql) => {
		const [{ id }] = await sql`select id from "user" where email = ${A.email}`;
		await sql`insert into import_settings (user_id, import_from) values (${id}, ${day(60)})
			on conflict (user_id) do update set import_from = excluded.import_from`;
		await sql`update gmail_connections set sync_cursor = now(), covered_from = null where user_id = ${id}`;
	});
	const before = (await state()).sync_cursor as Date;

	await sync(pageA, baseURL!);
	await expect
		.poll(async () =>
			(await items(A.email))
				.filter((i) => i.merchant === 'INTERMEDIA EJEMPLO')
				.map(({ merchant, amount, status, account }) => ({ merchant, amount, status, account }))
		)
		.toEqual([
			{ merchant: 'INTERMEDIA EJEMPLO', amount: 65400, status: 'pending', account: 'Pesos Visa A' }
		]);
	const after = await state();
	expect((after.covered_from as Date).getTime()).toBeLessThanOrEqual(
		(after.import_from as Date).getTime()
	);
	expect((after.sync_cursor as Date).getTime()).toBeGreaterThanOrEqual(before.getTime());
});
