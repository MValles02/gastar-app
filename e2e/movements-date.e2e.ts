import { expect, test, type Page } from '@playwright/test';
import { deleteMovements, login } from './helpers';

// Descriptions of movements this spec may have created; removed in afterEach.
const created: string[] = [];
const unique = (prefix: string) => {
	const d = `${prefix} ${Date.now()}`;
	created.push(d);
	return d;
};

test.beforeEach(async ({ page }) => {
	await login(page);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
});

// No-JS form: the pickers render as plain radio groups.
const option = (page: Page, group: 'Cuenta' | 'Categoría', name: RegExp) =>
	page.getByRole('group', { name: group, exact: true }).getByRole('radio', { name });

/** Creates a 1-peso outcome dated `date` through the no-JS form. */
async function create(page: Page, description: string, date: string) {
	await page.goto('/movements/new');
	await page.locator('input[name="amount"]').fill('1');
	await page.locator('input[name="description"]').fill(description);
	await option(page, 'Cuenta', /Banco Galicia/).check({ force: true });
	await option(page, 'Categoría', /Supermercado/).check({ force: true });
	await page.locator('input[name="occurredAt"]').fill(date);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();
}

// No JavaScript: the full page's native date input. With JavaScript: the Fecha row of the drawer.
const dateOf = (page: Page) => page.locator('input[name="occurredAt"]');

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('create stores the date and shows no time', async ({ page }) => {
		const desc = unique('Fecha crear');
		await create(page, desc, '2024-02-29');
		await page.goto(`/movements?q=${encodeURIComponent(desc)}`);
		await expect(
			page.getByRole('heading', { level: 2, name: /^Febrero( de)? 2024$/ })
		).toBeVisible();
		await expect(
			page
				.locator('section', { has: page.getByRole('heading', { name: 'Jueves 29', exact: true }) })
				.getByText(desc)
		).toBeVisible();
		await page.getByText(desc).click();
		await expect(dateOf(page)).toHaveValue('2024-02-29');
		await expect(dateOf(page)).not.toHaveText(/\d:\d\d/);
	});

	test('an impossible date posted directly is rejected with the value kept', async ({
		page,
		baseURL
	}) => {
		const res = await page.request.post('/movements/new', {
			form: { type: 'outcome', occurredAt: '2026-02-30', description: 'x', amount: '1' },
			headers: { origin: baseURL!, accept: 'text/html' }
		});
		expect(res.status()).toBe(400);
		const body = await res.text();
		expect(body).toContain('Ingresá una fecha válida.');
		expect(body).toContain('value="2026-02-30"');

		const bad = await page.request.post('/movements/new', {
			form: { type: 'outcome', occurredAt: '2024-02-29T25:00', description: 'x', amount: '1' },
			headers: { origin: baseURL!, accept: 'text/html' }
		});
		expect(bad.status()).toBe(400);
		expect(await bad.text()).toContain('Ingresá una fecha válida.');
	});

	test('a datetime is rejected and nothing is saved', async ({ page, baseURL }) => {
		await page.goto('/movements/new');
		const accountId = await option(page, 'Cuenta', /Banco Galicia/).getAttribute('value');
		const categoryId = await option(page, 'Categoría', /Supermercado/).getAttribute('value');
		const desc = unique('Fecha hora');
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
		expect(await res.text()).toContain('Ingresá una fecha válida.');
		await page.goto(`/movements?q=${encodeURIComponent(desc)}`);
		await expect(page.getByText(desc)).toHaveCount(0);
	});
});
test('a legacy non-midnight row uses its Buenos Aires date everywhere', async ({ page }) => {
	const list = '/movements?q=Legado';
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
