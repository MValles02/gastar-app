import { expect, test } from '@playwright/test';
import { deleteRules, fillRule, login, OTHER_EMAIL } from './helpers';

test('an update that submits a different type keeps the stored type', async ({ page, baseURL }) => {
	await login(page, OTHER_EMAIL);
	const description = `Tipo fijo ${Date.now()}`;
	try {
		await fillRule(page, {
			description,
			amount: '1.200',
			day: '12',
			account: 'Otra cuenta pesos',
			category: 'Ajena'
		});
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/plan$/);

		await page.getByRole('link', { name: new RegExp(description) }).click();
		await expect(page).toHaveURL(/\/plan\/recurring\/[0-9a-f-]{36}$/);
		const detail = new URL(page.url()).pathname;

		// A POST that tries to flip the type: the server ignores it.
		const res = await page.request.post(`${detail}?/update`, {
			form: { type: 'income', amount: '1.300' },
			headers: { origin: baseURL!, accept: 'text/html' }
		});
		expect(res.ok()).toBe(true);

		await page.goto('/plan');
		await expect(page.locator('.rule', { hasText: description })).toContainText('1.300');
		await expect(
			page
				.getByRole('region', { name: 'Ingresos fijos' })
				.locator('.rule', { hasText: description })
		).toHaveCount(0);
	} finally {
		await deleteRules(page, baseURL!, description);
	}
});
