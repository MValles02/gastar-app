import { expect, test, type Page } from '@playwright/test';
import { es } from '../src/lib/copy/es';
import { deleteMovements, login, NO_JS, noJsOption, unique } from './helpers';

// Descriptions of movements this spec may have created; removed in afterEach.
const created: string[] = [];

test.beforeEach(async ({ page }) => {
	await login(page);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
});

/** Creates a 1-peso outcome dated `date` through the no-JS form. */
async function create(page: Page, description: string, date: string) {
	await page.goto('/movements/new');
	await page.locator('input[name="amount"]').fill('1');
	await page.locator('input[name="description"]').fill(description);
	await noJsOption(page, 'Cuenta', /Banco Galicia/).check({ force: true });
	await noJsOption(page, 'Categoría', /Supermercado/).check({ force: true });
	await page.locator('input[name="occurredAt"]').fill(date);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();
}

// No JavaScript: the full page's native date input. With JavaScript: the Fecha row of the drawer.
const dateOf = (page: Page) => page.locator('input[name="occurredAt"]');

test.describe('without JavaScript', () => {
	test.use(NO_JS);

	test('create stores the date', async ({ page }) => {
		const desc = unique(created, 'Fecha crear');
		await create(page, desc, '2024-02-29');
		// Without date params the list shows this month only; `all=1` asks for every date.
		await page.goto(`/movements?q=${encodeURIComponent(desc)}&all=1`);
		await page.getByText(desc).click();
		await expect(dateOf(page)).toHaveValue('2024-02-29');
	});

	test('a datetime is rejected and nothing is saved', async ({ page, baseURL }) => {
		await page.goto('/movements/new');
		const accountId = await noJsOption(page, 'Cuenta', /Banco Galicia/).getAttribute('value');
		const categoryId = await noJsOption(page, 'Categoría', /Supermercado/).getAttribute('value');
		const desc = unique(created, 'Fecha hora');
		const res = await page.request.post('/movements/new', {
			form: {
				type: 'outcome',
				occurredAt: '2024-02-27T15:45',
				description: desc,
				amount: '1',
				accountId: accountId!,
				categoryId: categoryId!
			},
			headers: { origin: baseURL!, accept: 'text/html' }
		});
		expect(res.status()).toBe(400);
		expect(await res.text()).toContain(es.movements.errors.date);
		await page.goto(`/movements?q=${encodeURIComponent(desc)}`);
		await expect(page.getByText(desc)).toHaveCount(0);
	});
	test('the day heading totals the day outcomes', async ({ page }) => {
		const prefix = unique(created, 'Total dia');
		await create(page, `${prefix} a`, '2024-02-29');
		await create(page, `${prefix} b`, '2024-02-29');
		await page.goto(`/movements?q=${encodeURIComponent(prefix)}&all=1`);
		await expect(
			page
				.locator('section', { has: page.getByRole('heading', { name: 'Jueves 29', exact: true }) })
				.locator('.day-total')
		).toContainText('$2');
	});
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
