import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { statementOf } from './galicia-pdf';
import {
	CARD_EMAIL,
	fakeAlert,
	gmailSync,
	linkGmail,
	login,
	openItem,
	pick,
	reviewDrawer,
	upload,
	withDb
} from './helpers';

// Credit-card alerts (Gmail, e2e/fake-gmail.js) matched with uploaded Banco Galicia statements, in e2e/galicia-pdf.ts's
// synthetic PDFs. One seeded user used by no other spec; fixed 2026 dates and a merchant of its own per test, so
// a rerun on a reused DB starts clean (beforeAll clears the user's Gmail and Galicia state).
const mailbox = `card-${Date.now()}@gastar.local`;
const at = (day: string) => `${day}T15:00:00Z`;

test.describe.configure({ mode: 'serial' });

let ctx: BrowserContext;
let page: Page;

/** The user's items of a merchant (alert, statement and difference items alike), with the movement amount when approved. */
const items = (merchant: string) =>
	withDb(
		(sql) => sql`
			select i.external_key as key, i.alias_key as alias, i.status, i.kind, i.amount::int as amount,
				i.is_credit as credit, m.amount::int as moved
			from mp_import_items i left join movements m on m.id = i.movement_id
			where i.merchant = ${merchant} and i.user_id = (select id from "user" where email = ${CARD_EMAIL})
			order by i.external_key`
	);

/** Sends an alert of the credit card, syncs, and approves its item in the review drawer (no rule is learned). */
async function approvedAlert(baseURL: string, merchant: string, amount: string, day: string) {
	await fakeAlert(mailbox, { merchant, amount, date: at(day) });
	await gmailSync(page, baseURL);
	await openItem(page, merchant);
	await pick(page, 'Categoría', 'Compras Tarjeta');
	await reviewDrawer(page).getByRole('button', { name: 'Aprobar', exact: true }).click();
	await expect(reviewDrawer(page)).toHaveCount(0);
}

test.beforeAll(async ({ browser, baseURL }) => {
	await withDb(async (sql) => {
		const [u] = await sql`select id from "user" where email = ${CARD_EMAIL}`;
		await sql`delete from movements where id in (
			select movement_id from mp_import_items where movement_id is not null and user_id = ${u.id})`;
		await sql`delete from card_alerts where user_id = ${u.id}`;
		await sql`delete from import_cards where user_id = ${u.id}`;
		await sql`delete from card_statements where user_id = ${u.id}`;
		await sql`delete from mp_import_items where user_id = ${u.id}`;
		await sql`delete from mp_import_rules where user_id = ${u.id}`;
		await sql`delete from gmail_connections where user_id = ${u.id}`;
		await sql`delete from galicia_connections where user_id = ${u.id}`;
	});
	ctx = await browser.newContext({ baseURL });
	page = await ctx.newPage();
	await login(page, CARD_EMAIL);
	await linkGmail(page, baseURL!, mailbox);

	// The first alert makes the card known; it becomes a credit card on the Banco Galicia accounts.
	await fakeAlert(mailbox, {
		merchant: 'USD ALERTA EJEMPLO',
		amount: '12.34',
		currency: 'USD',
		foreign: true,
		date: at('2026-03-10')
	});
	await gmailSync(page, baseURL!);
	await page.goto('/imports');
	const href = await page
		.getByRole('link', { name: 'Tarjeta Visa ••5678: elegí qué es' })
		.getAttribute('href');
	await page.goto(href!, { waitUntil: 'networkidle' }); // hydration guard: the pickers need JavaScript
	await page.getByRole('radio', { name: 'Crédito' }).check({ force: true });
	await pick(page, 'Cuenta en pesos', 'Pesos Tarjeta');
	await pick(page, 'Cuenta en dólares', 'Dolares Tarjeta');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/imports$/);
});

test.afterAll(async () => {
	await ctx.close();
});

test('an approved USD alert and its statement line are one movement with nothing new to review', async () => {
	// Saving the credit card also set the Banco Galicia accounts the statement uses.
	const galicia = await withDb(
		(sql) => sql`select a.name as ars, d.name as usd from galicia_connections g
			join financial_accounts a on a.id = g.ars_account_id
			join financial_accounts d on d.id = g.usd_account_id
			where g.user_id = (select id from "user" where email = ${CARD_EMAIL})`
	);
	expect(galicia).toEqual([{ ars: 'Pesos Tarjeta', usd: 'Dolares Tarjeta' }]);

	await openItem(page, 'USD ALERTA EJEMPLO');
	await pick(page, 'Categoría', 'Compras Tarjeta');
	await reviewDrawer(page).getByRole('button', { name: 'Aprobar', exact: true }).click();
	await expect(reviewDrawer(page)).toHaveCount(0);

	await upload(
		page,
		statementOf({
			number: 'VI-TARJETA-001',
			closing: '27-03-26',
			lines: [
				{ date: '10-03-26', reference: 'USD ALERTA EJEMPLO', voucher: '000101', usd: '12,34' }
			]
		})
	);
	await expect(page).toHaveURL(/\/imports/);

	const rows = await items('USD ALERTA EJEMPLO');
	expect(rows).toHaveLength(1);
	expect(rows[0]).toMatchObject({ status: 'approved', moved: 1234 });
	expect(rows[0].key).toMatch(/^alert:/);
	expect(rows[0].alias).toBe('galicia:visa:000101::2026-03-10:USD:1234');
});

test('a pesos alert approved at 5% less than its statement line keeps its movement and gets one difference item', async ({
	baseURL
}) => {
	await approvedAlert(baseURL!, 'PESOS DIFERENCIA EJEMPLO', '10000.00', '2026-04-10');
	const statement = () =>
		statementOf({
			number: 'VI-TARJETA-002',
			closing: '27-04-26',
			lines: [
				{
					date: '10-04-26',
					reference: 'PESOS DIFERENCIA EJEMPLO',
					voucher: '000201',
					ars: '10.500,00'
				}
			]
		});
	await upload(page, statement());
	await expect(page).toHaveURL(/\/imports/);

	const expected = [
		expect.objectContaining({ kind: 'card_purchase', status: 'approved', moved: 1_000_000 }),
		expect.objectContaining({
			key: expect.stringMatching(/^diff:galicia:visa:000201:/),
			kind: 'card_adjustment',
			status: 'pending',
			amount: 50_000,
			credit: false
		})
	];
	expect(await items('PESOS DIFERENCIA EJEMPLO')).toEqual(expect.arrayContaining(expected));
	expect(await items('PESOS DIFERENCIA EJEMPLO')).toHaveLength(2);

	await upload(page, statement());
	await expect(page.getByText('Sin movimientos nuevos.')).toBeVisible();
	expect(await items('PESOS DIFERENCIA EJEMPLO')).toHaveLength(2);
});

test('an alert for a 6-cuota purchase approved at the total nets to the first cuota after the statement', async ({
	baseURL
}) => {
	await approvedAlert(baseURL!, 'CUOTAS EJEMPLO', '60000.00', '2026-05-10');
	await upload(
		page,
		statementOf({
			number: 'VI-TARJETA-003',
			closing: '27-05-26',
			lines: [
				{
					date: '10-05-26',
					reference: 'CUOTAS EJEMPLO',
					cuota: '01/06',
					voucher: '000301',
					ars: '10.000,00'
				}
			]
		})
	);
	await expect(page).toHaveURL(/\/imports/);

	const rows = await items('CUOTAS EJEMPLO');
	expect(rows).toHaveLength(2);
	const purchase = rows.find((r) => r.kind === 'card_purchase')!;
	const difference = rows.find((r) => r.kind === 'card_adjustment')!;
	expect(purchase.moved).toBe(6_000_000);
	expect(purchase.moved - (difference.credit ? difference.amount : -difference.amount)).toBe(
		1_000_000
	);
});

test('two monthly alerts of the same merchant and amount each match their own statement line', async ({
	baseURL
}) => {
	const merchant = 'MENSUAL EJEMPLO';
	await fakeAlert(mailbox, { merchant, amount: '8000.00', date: at('2026-06-05') });
	await fakeAlert(mailbox, { merchant, amount: '8000.00', date: at('2026-07-05') });
	await gmailSync(page, baseURL!);
	expect(await items(merchant)).toHaveLength(2);

	for (const [n, closing, date, voucher] of [
		['004', '29-06-26', '05-06-26', '000401'],
		['005', '29-07-26', '05-07-26', '000402']
	]) {
		await upload(
			page,
			statementOf({
				number: `VI-TARJETA-${n}`,
				closing,
				lines: [{ date, reference: merchant, voucher, ars: '8.000,00' }]
			})
		);
		await expect(page).toHaveURL(/\/imports/);
	}

	const rows = await withDb(
		(
			sql
		) => sql`select to_char(occurred_at at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD') as day,
				alias_key as alias
			from mp_import_items where merchant = ${merchant} and external_key like 'alert:%'
				and user_id = (select id from "user" where email = ${CARD_EMAIL}) order by occurred_at`
	);
	expect(rows).toEqual([
		{ day: '2026-06-05', alias: 'galicia:visa:000401::2026-06-05:ARS:800000' },
		{ day: '2026-07-05', alias: 'galicia:visa:000402::2026-07-05:ARS:800000' }
	]);
	// Both lines matched: no statement item exists for the merchant.
	expect(await items(merchant)).toHaveLength(2);
});

test('a statement uploaded before its alert arrives leaves the alert without an item', async ({
	baseURL
}) => {
	const merchant = 'ADELANTADO EJEMPLO';
	await upload(
		page,
		statementOf({
			number: 'VI-TARJETA-006',
			closing: '27-02-26',
			lines: [{ date: '05-02-26', reference: merchant, voucher: '000501', ars: '3.210,00' }]
		})
	);
	await expect(page).toHaveURL(/\/imports/);
	await fakeAlert(mailbox, { merchant, amount: '3210.00', date: at('2026-02-05') });
	await gmailSync(page, baseURL!);

	const rows = await items(merchant);
	expect(rows).toHaveLength(1);
	expect(rows[0].key).toMatch(/^galicia:visa:000501:/);
	expect(rows[0].alias).toMatch(/^alert:/);
	const [alert] = await withDb(
		(sql) => sql`select i.external_key as key, a.merchant from card_alerts a
			join mp_import_items i on i.id = a.import_item_id where a.merchant = ${merchant}`
	);
	expect(alert.key).toBe(rows[0].key);
});

test('an alert still unmatched after two statements is listed and "Descartar" removes its movement', async ({
	baseURL
}) => {
	const merchant = 'FANTASMA EJEMPLO';
	await approvedAlert(baseURL!, merchant, '7777.00', '2026-08-03');
	for (const [n, closing, date, voucher] of [
		['007', '29-08-26', '20-08-26', '000701'],
		['008', '29-09-26', '20-09-26', '000702']
	]) {
		await upload(
			page,
			statementOf({
				number: `VI-TARJETA-${n}`,
				closing,
				lines: [{ date, reference: 'OTRO COMERCIO EJEMPLO', voucher, ars: '1.111,00' }]
			})
		);
		await expect(page).toHaveURL(/\/imports/);
	}

	const listed = page.getByRole('region', { name: 'No apareció en el resumen' });
	const row = listed.getByRole('listitem').filter({ hasText: merchant });
	await expect(row).toBeVisible();
	await row.getByRole('button', { name: 'Descartar' }).click();
	await expect(row).toHaveCount(0);

	const rows = await items(merchant);
	expect(rows).toHaveLength(1);
	expect(rows[0]).toMatchObject({ status: 'rejected', moved: null });
});
