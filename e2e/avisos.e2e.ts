import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	fillMovement,
	fillSavings,
	login,
	OTHER_EMAIL,
	pick,
	postDelete
} from './helpers';

// Every test that writes runs as `otro` (ARS account "Otra cuenta pesos", category "Ajena"). Other specs
// change his data too, so every assertion is about one uniquely named row, never a count.
test.describe.configure({ timeout: 60_000 });

const alertRow = (page: Page, text: string) => page.getByRole('listitem').filter({ hasText: text });

test('an exceeded limit raises an alert that opens that limit', async ({ page, baseURL }) => {
	await login(page, OTHER_EMAIL);
	// Fail loudly if another spec gave otro an ARS plan: this test must own it to delete it.
	await page.goto('/plan');
	await expect(page.getByText('Sin plan')).toBeVisible();
	const description = `Límite aviso e2e ${Date.now()}`;
	let created = false;
	try {
		await page.goto('/plan/setup?step=3');
		await fillSavings(page, { option: 'Nada' });
		await page.getByRole('button', { name: 'Siguiente' }).click();
		created = true;
		await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);
		await page.getByRole('link', { name: 'Siguiente' }).click();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Plan guardado.')).toBeVisible();

		await page.goto('/plan/limits/new');
		await pick(page, 'Categoría', 'Ajena');
		await page.locator('input[name="amount"]').fill('1');
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/plan$/);

		await fillMovement(page, {
			type: 'Gasto',
			amount: '2',
			description,
			account: 'Otra cuenta pesos',
			category: 'Ajena'
		});
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();

		await page.goto('/notifications');
		await alertRow(page, 'Ajena').getByRole('link').click();
		await expect(page.getByRole('dialog', { name: 'Límite de Ajena' })).toBeVisible();
	} finally {
		await deleteMovements(page, baseURL!, description);
		if (created) await postDelete(page, baseURL!, `${baseURL}/plan`);
	}
});
