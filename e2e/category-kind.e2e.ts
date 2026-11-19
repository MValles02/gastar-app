import { expect, test } from '@playwright/test';
import { login, NO_JS, noJsOption } from './helpers';

const MISMATCH = 'Esa categoría es de ingresos. Elegí otra.';

test.describe('without JavaScript', () => {
	test.use(NO_JS);

	test('an income category is rejected for an expense and nothing is saved', async ({
		page,
		baseURL
	}) => {
		await login(page);
		await page.goto('/movements/new');
		const accountId = await noJsOption(page, 'Cuenta', /Banco Galicia/).getAttribute('value');
		const categoryId = await noJsOption(page, 'Categoría', /Sueldo/).getAttribute('value');
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
