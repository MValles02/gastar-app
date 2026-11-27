import { expect, test, type Page } from '@playwright/test';
import { es } from '../src/lib/copy/es';
import { deleteMovements, idByName, login, post, postAction, SEED_EMAIL, unique } from './helpers';

// Descriptions of movements this spec may have created; removed in afterEach.
const created: string[] = [];

test.beforeEach(async ({ page }) => {
	await login(page);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
});

/** The form of a 1-peso outcome on Banco Galicia / Supermercado dated `date`. */
async function outcome(description: string, date: string) {
	return {
		type: 'outcome',
		occurredAt: date,
		description,
		amount: '1',
		accountId: await idByName('financial_accounts', SEED_EMAIL, 'Banco Galicia'),
		categoryId: await idByName('categories', SEED_EMAIL, 'Supermercado')
	};
}

/** Creates a 1-peso outcome dated `date` through the form action. */
async function create(page: Page, baseURL: string, description: string, date: string) {
	const res = await post(page, baseURL, '/movements/new', await outcome(description, date));
	expect(res.ok()).toBe(true);
}

test('a datetime is rejected and nothing is saved', async ({ page, baseURL }) => {
	const desc = unique(created, 'Fecha hora');
	const res = await postAction(
		page,
		baseURL!,
		'/movements/new',
		await outcome(desc, '2024-02-27T15:45')
	);
	const body = await res.json();
	expect(body.status).toBe(400);
	expect(body.data).toContain(es.movements.errors.date);
	await page.goto(`/movements?q=${encodeURIComponent(desc)}`);
	await expect(page.getByText(desc)).toHaveCount(0);
});

test('the day heading totals the day outcomes', async ({ page, baseURL }) => {
	const prefix = unique(created, 'Total dia');
	await create(page, baseURL!, `${prefix} a`, '2024-02-29');
	await create(page, baseURL!, `${prefix} b`, '2024-02-29');
	await page.goto(`/movements?q=${encodeURIComponent(prefix)}&all=1`);
	await expect(
		page
			.locator('section', { has: page.getByRole('heading', { name: 'Jueves 29', exact: true }) })
			.locator('.day-total')
	).toContainText('$2');
});

test('a legacy non-midnight row uses its Buenos Aires date everywhere', async ({ page }) => {
	const list = '/movements?q=Legado&all=1';
	await page.goto(list);
	await expect(page.getByRole('heading', { level: 2, name: /^Marzo( de)? 2025$/ })).toBeVisible();
	await expect(
		page
			.locator('section', { has: page.getByRole('heading', { name: 'Viernes 14', exact: true }) })
			.getByText('Legado fin del día')
	).toBeVisible();
	await page.goto(`${list}&from=2025-03-14&to=2025-03-14`);
	await expect(page.getByText('Legado fin del día')).toBeVisible();
	await page.goto(`${list}&from=2025-03-15&to=2025-03-15`);
	await expect(page.getByText('Sin resultados.')).toBeVisible();

	await page.goto(list);
	await page.getByText('Legado fin del día').click();
	await expect(page.getByRole('dialog').getByRole('button', { name: /^Fecha/ })).toContainText(
		'14/03/2025'
	);
});
