import { expect, test } from '@playwright/test';
import { login, OTHER_EMAIL, postDelete } from './helpers';

const MISMATCH = 'Esa categoría es de ingresos. Elegí otra.';

test.describe('with JavaScript', () => {
	test('the category picker follows the movement type', async ({ page }) => {
		await login(page);
		await page.goto('/movements/new', { waitUntil: 'networkidle' });
		const dialog = page.getByRole('dialog');
		const open = () => page.getByRole('button', { name: /Categoría/ }).click();

		await open();
		await expect(dialog.getByText('Supermercado', { exact: true })).toBeVisible();
		await expect(dialog.getByText('Regalos', { exact: true })).toBeVisible();
		await expect(dialog.getByText('Sueldo', { exact: true })).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();

		await page.getByRole('radio', { name: 'Ingreso' }).check({ force: true });
		await open();
		await expect(dialog.getByText('Sueldo', { exact: true })).toBeVisible();
		await expect(dialog.getByText('Regalos', { exact: true })).toBeVisible();
		await expect(dialog.getByText('Supermercado', { exact: true })).toHaveCount(0);
	});

	test('a new Ingreso category is not offered for expenses', async ({ page, baseURL }) => {
		await login(page, OTHER_EMAIL);
		const name = `Solo ingresos ${Date.now()}`;
		let href: string | undefined;
		try {
			await page.goto('/categories/new', { waitUntil: 'networkidle' });
			await page.locator('input[name="name"]').fill(name);
			await page.getByRole('radio', { name: 'Ingreso' }).check({ force: true });
			await page.getByRole('button', { name: 'Crear categoría' }).click();
			await expect(page).toHaveURL(/\/categories\/[0-9a-f-]{36}$/);
			href = new URL(page.url()).pathname;

			await page.goto('/movements/new', { waitUntil: 'networkidle' });
			await page.getByRole('button', { name: /Categoría/ }).click();
			const dialog = page.getByRole('dialog');
			await expect(dialog.getByText('Ajena', { exact: true })).toBeVisible();
			await expect(dialog.getByText(name, { exact: true })).toHaveCount(0);
		} finally {
			if (href) await postDelete(page, baseURL!, href);
		}
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('an income category is rejected for an expense and nothing is saved', async ({
		page,
		baseURL
	}) => {
		await login(page);
		await page.goto('/movements/new');
		const option = (group: 'Cuenta' | 'Categoría', name: RegExp) =>
			page.getByRole('group', { name: group, exact: true }).getByRole('radio', { name });
		const accountId = await option('Cuenta', /Banco Galicia/).getAttribute('value');
		const categoryId = await option('Categoría', /Sueldo/).getAttribute('value');
		const desc = `Tipo cruzado ${Date.now()}`;

		const res = await page.request.post('/movements/new', {
			form: {
				type: 'outcome',
				occurredAt: '2024-02-27',
				description: desc,
				amount: '1',
				accountId: accountId!,
				categoryId: categoryId!
			},
			headers: { origin: baseURL!, accept: 'text/html' }
		});
		expect(res.status()).toBe(400);
		expect(await res.text()).toContain(MISMATCH);

		await page.goto(`/movements?q=${encodeURIComponent(desc)}`);
		await expect(page.getByText(desc)).toHaveCount(0);
	});
});
