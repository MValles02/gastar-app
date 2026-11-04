import { expect, test } from '@playwright/test';
import { deleteRules, fillRule, login, OTHER_EMAIL } from './helpers';

test('an edit that submits a different type keeps the stored type', async ({ page, baseURL }) => {
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
		await page.getByRole('link', { name: 'Editar' }).click();
		await expect(page).toHaveURL(new RegExp(`${detail}/edit$`));
		const value = (name: string) => page.locator(`input[name="${name}"]`).inputValue();
		const form = {
			type: 'income',
			description: await value('description'),
			amount: await value('amount'),
			accountId: await value('accountId'),
			categoryId: await value('categoryId'),
			dayOfMonth: await value('dayOfMonth')
		};

		// A no-JS style POST that tries to flip the type: the server ignores it.
		const res = await page.request.post(`${detail}/edit`, {
			form,
			headers: { origin: baseURL!, accept: 'text/html' }
		});
		expect(res.ok()).toBe(true);

		await page.goto(detail);
		await expect(page.getByText('Pago fijo', { exact: true })).toBeVisible();
		await page.goto('/plan');
		await expect(
			page.getByRole('region', { name: 'Pagos fijos' }).locator('.rule', { hasText: description })
		).toBeVisible();
		await expect(
			page
				.getByRole('region', { name: 'Ingresos fijos' })
				.locator('.rule', { hasText: description })
		).toHaveCount(0);
	} finally {
		await deleteRules(page, baseURL!, description);
	}
});
