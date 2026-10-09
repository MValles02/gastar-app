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

async function create(page: Page, description: string, date: string) {
	await page.goto('/movements/new');
	await page.locator('input[name="amount"]').fill('1');
	await page.locator('input[name="description"]').fill(description);
	await option(page, 'Cuenta', /Banco Galicia/).check({ force: true });
	await option(page, 'Categoría', /Supermercado/).check({ force: true });
	await page.locator('input[name="occurredAt"]').fill(date);
	await page.getByRole('button', { name: 'Guardar movimiento' }).click();
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();
}

const dateOf = (page: Page) => page.locator('dt', { hasText: 'Fecha' }).locator('+ dd');

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('create stores the date and shows no time', async ({ page }) => {
		const desc = unique('Fecha crear');
		await create(page, desc, '2024-02-29');
		await page.goto(`/movements?q=${encodeURIComponent(desc)}`);
		await expect(
			page
				.locator('section', {
					has: page.getByRole('heading', { name: 'Jueves 29 de febrero de 2024' })
				})
				.getByText(desc)
		).toBeVisible();
		await page.getByText(desc).click();
		await expect(dateOf(page)).toHaveText('jueves, 29 de febrero de 2024');
		await expect(dateOf(page)).not.toHaveText(/\d:\d\d/);
	});

	test('edit keeps the date', async ({ page }) => {
		const desc = unique('Fecha editar');
		await create(page, desc, '2024-02-29');
		await page.goto(`/movements?q=${encodeURIComponent(desc)}`);
		await page.getByText(desc).click();
		await page.getByRole('link', { name: 'Editar' }).click();
		await expect(page.locator('input[name="occurredAt"]')).toHaveValue('2024-02-29');
		await page.getByRole('button', { name: 'Guardar cambios' }).click();
		await expect(dateOf(page)).toHaveText('jueves, 29 de febrero de 2024');
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

	test('same-day movements list the newest first', async ({ page }) => {
		const prefix = unique('Orden');
		await create(page, `${prefix} A`, '2024-02-28');
		await create(page, `${prefix} B`, '2024-02-28');
		await page.goto(`/movements?q=${encodeURIComponent(prefix)}`);
		await expect(page.getByText(new RegExp(`^${prefix} [AB]$`))).toHaveText([
			`${prefix} B`,
			`${prefix} A`
		]);
	});
});

test('a date before 2000 shows the error and keeps the value', async ({ page }) => {
	await page.goto('/movements/new', { waitUntil: 'networkidle' });
	await page.locator('input[name="amount"]').fill('1');
	await page.locator('input[name="description"]').fill(unique('Fecha antigua'));
	await page.locator('input[name="occurredAt"]').fill('1999-12-31');
	await page.getByRole('button', { name: 'Guardar movimiento' }).click();
	await expect(page.getByText('Ingresá una fecha válida.')).toBeVisible();
	await expect(page.locator('input[name="occurredAt"]')).toHaveValue('1999-12-31');
	await expect(page).toHaveURL(/\/movements\/new$/);
});

test('a legacy non-midnight row uses its Buenos Aires date everywhere', async ({ page }) => {
	const list = '/movements?q=Legado';
	await page.goto(list, { waitUntil: 'networkidle' });
	await expect(
		page
			.locator('section', {
				has: page.getByRole('heading', { name: 'Viernes 14 de marzo de 2025' })
			})
			.getByText('Legado fin del día')
	).toBeVisible();
	await page.goto(`${list}&from=2025-03-14&to=2025-03-14`);
	await expect(page.getByText('Legado fin del día')).toBeVisible();
	await page.goto(`${list}&from=2025-03-15&to=2025-03-15`);
	await expect(page.getByText('Sin resultados.')).toBeVisible();

	await page.goto(list);
	await page.getByText('Legado fin del día').click();
	await expect(dateOf(page)).toHaveText('viernes, 14 de marzo de 2025');
	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(page.locator('input[name="occurredAt"]')).toHaveValue('2025-03-14');
});
