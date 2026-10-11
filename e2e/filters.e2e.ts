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

test('the movements drawer type control applies the filter', async ({ page }) => {
	await page.goto('/movements', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Filtros' }).click();
	await page.getByRole('dialog').getByText('Ingresos', { exact: true }).click();
	await expect(page).toHaveURL(/type=income/);
});

test('arrow + space on a segmented control navigates once', async ({ page }) => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	let navs = 0;
	page.on('framenavigated', () => navs++);
	await page.locator('[role="radio"][aria-checked="true"]').focus();
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('Space');
	await expect(page).toHaveURL(/currency=/);
	await page.waitForTimeout(800);
	expect(navs).toBe(1);
});
