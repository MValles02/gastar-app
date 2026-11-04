// Inicio (F3): the first-run checklist follows the user's data, an overspent plan shows on Inicio, and the
// Mercado Pago pill counts the items left to review. Runs as this file's own user (1 sign-up, see
// signUpVerified), so every figure is exact: no other spec writes this user's data. Serial: each test
// builds on the previous one's data.
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import postgres from 'postgres';
import { fillSavings, pick, PHONE, signUpVerified } from './helpers';

test.describe.configure({ mode: 'serial', timeout: 90_000 });

const email = `e2e+home-${Date.now()}@gastar.local`;
let context: BrowserContext;
let page: Page;
let baseURL: string;
let accountId = '';

const checklist = () => page.getByRole('region', { name: 'Empezá en 3 pasos' });
const step = (title: RegExp) => checklist().getByRole('listitem').filter({ hasText: title });

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

test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
	baseURL = testInfo.project.use.baseURL!;
	context = await browser.newContext({ baseURL, viewport: PHONE });
	page = await context.newPage();
	await signUpVerified(page, context.request, {
		email,
		password: 'e2e-pass-1234',
		name: 'E2E Home'
	});
});

test.afterAll(async () => {
	await context.close();
});

test('step 1: only "cuenta" is open until an account exists, then it ticks', async () => {
	await page.goto('/');
	await expect(step(/Creá tu primera cuenta/).getByRole('link')).toBeVisible();
	await expect(step(/Registrá un movimiento/).getByRole('link')).toHaveCount(0);
	await expect(step(/Armá tu plan/).getByRole('link')).toHaveCount(0);

	await step(/Creá tu primera cuenta/)
		.getByRole('link')
		.click();
	await expect(page).toHaveURL(/\/accounts\/new$/);
	await page.getByLabel('Nombre').fill('Caja home');
	await page.getByLabel('Saldo inicial').fill('1.000');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	accountId = page.url().split('/').pop()!;

	await page.goto('/');
	await expect(step(/Creá tu primera cuenta/)).toContainText('Hecho');
	await expect(step(/Registrá un movimiento/).getByRole('link')).toBeVisible();
	await expect(step(/Armá tu plan/).getByRole('link')).toBeVisible();
});

test('step 2 ticks after saving a movement from its drawer', async () => {
	const res = await page.request.post('/categories/new', {
		form: { name: 'Varios home', color: 'blue', kind: '' },
		headers: { origin: baseURL, accept: 'text/html' }
	});
	expect(res.ok()).toBe(true);
	await page.goto('/');
	await page.waitForLoadState('networkidle'); // hydration guard: the step opens a JS-only drawer
	await step(/Registrá un movimiento/)
		.getByRole('link')
		.click();
	const drawer = page.getByRole('dialog', { name: 'Nuevo movimiento' });
	await page.locator('input[name="amount"]').fill('100');
	await page.locator('input[name="description"]').fill('Primer gasto home');
	await pick(page, 'Cuenta', 'Caja home');
	await pick(page, 'Categoría', 'Varios home');
	await drawer.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(drawer).toBeHidden();
	await expect(step(/Registrá un movimiento/)).toContainText('Hecho');
});

test('step 3: the plan wizard leaves no step behind /plan, the checklist goes, and Inicio shows the overspend', async () => {
	await step(/Armá tu plan/)
		.getByRole('link')
		.click();
	await expect(page).toHaveURL(/\/plan\/setup/);
	await page.getByRole('link', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/step=2$/);
	await page.getByRole('link', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/step=3$/);
	// Savings far above any income: over from the first day.
	await fillSavings(page, { option: 'Otro', unit: '$', value: '99.999.999' });
	await page.getByRole('button', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/step=4$/);
	await page.getByRole('link', { name: 'Siguiente' }).click();
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByText('Plan guardado.')).toBeVisible();
	await expect(page).toHaveURL(/\/plan$/);
	await page.goBack();
	await expect(page).not.toHaveURL(/\/plan\/setup/);
	await expect(page).toHaveURL(/\/$/);

	await page.goto('/');
	await expect(checklist()).toHaveCount(0);
	const card = page.getByRole('region', { name: 'Disponible', exact: true });
	await expect(card.getByText('Te pasaste', { exact: true })).toBeVisible();
	await expect(card).toContainText('$0 por día');
});

test('the Mercado Pago pill counts pending imports and opens the review list', async () => {
	await withDb(async (sql) => {
		const [{ id: userId }] = await sql`select id from "user" where email = ${email}`;
		await sql`
			insert into mp_connections (user_id, account_id, mp_user_id, access_token, expires_at)
			values (${userId}, ${accountId}, 'home-e2e', 'v1:AAAA', now() + interval '1 day')
		`;
		for (const n of [1, 2])
			await sql`
				insert into mp_import_items (user_id, account_id, external_key, kind, occurred_at, amount, is_credit, source_id, raw_description)
				values (${userId}, ${accountId}, ${`home-e2e-${n}`}, 'payment', now(), ${n * 1000}, false, ${`home-e2e-${n}`}, 'Pago home')
			`;
	});

	await page.goto('/');
	await page.getByRole('link', { name: 'Mercado Pago: 2 movimientos para revisar' }).click();
	await expect(page).toHaveURL(/\/imports$/);
	await expect(page.locator('[data-slot="item-group"] [role="listitem"]')).toHaveCount(2);

	await withDb(
		(sql) =>
			sql`update mp_import_items set status = 'rejected' where external_key like 'home-e2e-%'`
	);
	await page.goto('/');
	await expect(page.getByRole('link', { name: 'Mercado Pago: al día' })).toBeVisible();
});
