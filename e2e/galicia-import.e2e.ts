import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';
import { visaStatement } from './galicia-pdf';
import { GALICIA_EMAIL, login, OTHER_EMAIL, pick } from './helpers';

test.describe.configure({ mode: 'serial' });

let page: Page;

async function withDb<T>(fn: (sql: postgres.Sql) => Promise<T>) {
	const sql = postgres(
		process.env.DATABASE_URL || 'postgres://gastar:gastar@localhost:5432/gastar'
	);
	try {
		return await fn(sql);
	} finally {
		await sql.end();
	}
}

/** The user's imported items with their account, local day and signed amount, oldest key first. */
const items = () =>
	withDb(
		(sql) => sql`select i.id, a.name as account, i.kind, i.installment, i.source,
			to_char(i.occurred_at at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD') as day,
			(case when i.is_credit then -i.amount else i.amount end)::int as cents
		from mp_import_items i join financial_accounts a on a.id = i.account_id
		where i.user_id = (select id from "user" where email = ${GALICIA_EMAIL})
		order by i.external_key`
	);

/** Uploads a statement from /profile/galicia. */
async function upload(pdf: Buffer) {
	await page.goto('/profile/galicia');
	await page
		.locator('input[name="statement"]')
		.setInputFiles({ name: 'resumen.pdf', mimeType: 'application/pdf', buffer: pdf });
	await page.getByRole('button', { name: 'Subir resumen' }).click();
}

test.beforeAll(async ({ browser }) => {
	// Local DBs are reused between runs: start from no items and no connection.
	await withDb(
		(sql) => sql`with u as (select id from "user" where email = ${GALICIA_EMAIL})
			, d as (delete from mp_import_items where user_id in (select id from u))
			delete from galicia_connections where user_id in (select id from u)`
	);
	page = await browser.newPage();
	await login(page, GALICIA_EMAIL);
});

test.afterAll(async () => {
	await page.close();
});

test('a statement lands its lines on the chosen pesos and dollar accounts', async () => {
	await page.goto('/profile/vinculaciones');
	await page.getByRole('link', { name: /Banco Galicia/ }).click();
	await expect(page).toHaveURL(/\/profile\/galicia$/);
	await page.waitForLoadState('networkidle'); // hydration guard: the account pickers save through JS
	await pick(page, 'Pesos', 'Caja pesos');
	await expect(page.getByRole('button', { name: /Pesos/ })).toContainText('Caja pesos');
	await pick(page, 'Dólares', 'Caja dólares');
	await expect(page.getByRole('button', { name: /Dólares/ })).toContainText('Caja dólares');

	await upload(visaStatement());
	await expect(page).toHaveURL(/\/imports/);
	await expect(page.getByText('5 movimientos nuevos.')).toBeVisible();
	await expect(page.locator('main').getByText('TIENDA FICTICIA_CS 03/06')).toBeVisible();
	await expect(page.locator('main').getByText('Impuestos y percepciones')).toBeVisible();

	// Installments and taxes at the closing date, single purchases at their own date; credits signed.
	expect(
		(await items()).map(({ account, kind, installment, source, day, cents }) => ({
			account,
			kind,
			installment,
			source,
			day,
			cents
		}))
	).toEqual(
		expect.arrayContaining([
			{
				account: 'Caja pesos',
				kind: 'card_installment',
				installment: '03/06',
				source: 'galicia_visa',
				day: '2026-09-29',
				cents: 10_000_00
			},
			{
				account: 'Caja pesos',
				kind: 'card_purchase',
				installment: null,
				source: 'galicia_visa',
				day: '2026-09-10',
				cents: 2_500_50
			},
			{
				account: 'Caja dólares',
				kind: 'card_purchase',
				installment: null,
				source: 'galicia_visa',
				day: '2026-09-12',
				cents: 15_00
			},
			{
				account: 'Caja pesos',
				kind: 'card_purchase',
				installment: null,
				source: 'galicia_visa',
				day: '2026-09-14',
				cents: -500_00
			},
			{
				account: 'Caja pesos',
				kind: 'card_taxes',
				installment: null,
				source: 'galicia_visa',
				day: '2026-09-29',
				cents: 65_00
			}
		])
	);
	expect(await items()).toHaveLength(5);
});

test('uploading the same statement again creates nothing', async () => {
	await upload(visaStatement());
	await expect(page.getByText('Sin movimientos nuevos.')).toBeVisible();
	expect(await items()).toHaveLength(5);
});

test('a statement that does not add up to its total is rejected with nothing written', async () => {
	await upload(visaStatement({ number: 'VI00000000007654321', total: '12.065,51' }));
	await expect(page.getByRole('alert')).toHaveText(
		'El resumen no cuadra con el total; no se importó nada.'
	);
	await expect(page).toHaveURL(/\/profile\/galicia/);
	expect(await items()).toHaveLength(5);
});

test('a remembered merchant matches the same merchant with another reference code next month', async () => {
	await page.goto('/categories/new');
	await page.locator('input[name="name"]').fill('Servicios Galicia');
	await page.getByRole('radio', { name: 'Gastos' }).check({ force: true });
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/categories\/[0-9a-f-]{36}$/);

	await upload(
		visaStatement({
			number: 'VI00000000002222222',
			cafe: { reference: 'MOVISTAR DA 000000583683789', voucher: '000901' }
		})
	);
	await expect(page).toHaveURL(/\/imports/);
	await page.waitForLoadState('networkidle'); // hydration guard: the drawer is a shallow route opened by JS
	await page
		.locator('[data-slot="item-group"] [role="listitem"]')
		.filter({ hasText: 'MOVISTAR DA' })
		.getByRole('link')
		.click();
	const drawer = page.getByRole('dialog', { name: 'Revisar movimiento' });
	await expect(drawer).toBeVisible();
	await pick(page, 'Categoría', 'Servicios Galicia');
	await page.getByRole('checkbox', { name: 'Recordar para la próxima' }).check();
	await drawer.getByRole('button', { name: 'Aprobar', exact: true }).click();
	await expect(drawer).toHaveCount(0);

	// Next month: same merchant, another code; the upload approves it with the learned category.
	await upload(
		visaStatement({
			number: 'VI00000000003333333',
			cafe: { reference: 'MOVISTAR DA 000000600111222', voucher: '000902' }
		})
	);
	// The upload auto-approves before it redirects to the inbox.
	await expect(page).toHaveURL(/\/imports/);
	const rows = await withDb(
		(sql) => sql`select i.status, c.name as category from mp_import_items i
			join movements m on m.id = i.movement_id join categories c on c.id = m.category_id
			where i.merchant = 'MOVISTAR DA 000000600111222'
				and i.user_id = (select id from "user" where email = ${GALICIA_EMAIL})`
	);
	expect(rows).toEqual([{ status: 'approved', category: 'Servicios Galicia' }]);
});

test('another user cannot open the imported items', async ({ browser }) => {
	const [item] = await items();
	const ctx = await browser.newContext();
	const p = await ctx.newPage();
	try {
		await login(p, OTHER_EMAIL);
		expect((await p.goto(`/imports/${item.id}`))!.status()).toBe(404);
		await p.goto('/imports');
		await expect(p.locator('main').getByText('TIENDA FICTICIA_CS')).toHaveCount(0);
	} finally {
		await ctx.close();
	}
});
