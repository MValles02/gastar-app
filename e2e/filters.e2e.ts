import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
});

test('accounts filter bar submits on the archived checkbox and the currency control', async ({
	page
}) => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await page.getByRole('checkbox', { name: 'Mostrar archivadas' }).click();
	await expect(page).toHaveURL(/archived=1/);
	await expect(page.getByText('Cuenta Santander (cerrada)')).toBeVisible();

	await page.getByRole('radio', { name: 'USD' }).check({ force: true });
	await expect(page).toHaveURL(/currency=USD/);
});

test('categories filter bar submits on the archived checkbox', async ({ page }) => {
	await page.goto('/categories', { waitUntil: 'networkidle' });
	await page.getByRole('checkbox', { name: 'Mostrar archivadas' }).click();
	await expect(page).toHaveURL(/archived=1/);
});

test('keyboard selection on the accounts currency control submits the filter', async ({ page }) => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await page.locator('[role="radio"][aria-checked="true"]').focus();
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('Space');
	await expect(page).toHaveURL(/currency=/);
});
