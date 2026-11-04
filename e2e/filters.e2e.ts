import { expect, test } from '@playwright/test';
import { login, openFilters } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
});

const filtersButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /^Filtros/ });

test('accounts filters submit on the archived checkbox and the currency control, and count', async ({
	page
}) => {
	await page.goto('/accounts');
	await page.waitForLoadState('networkidle'); // hydration guard: the Filtros drawer needs JS
	let dialog = await openFilters(page);
	await dialog.getByRole('checkbox', { name: 'Mostrar archivadas' }).click();
	await expect(page).toHaveURL(/archived=1/);
	await expect(filtersButton(page)).toContainText('1');
	await expect(page.getByText('Cuenta Santander (cerrada)')).toBeVisible();

	dialog = page.getByRole('dialog');
	await dialog.getByRole('radio', { name: 'USD' }).check({ force: true });
	await expect(page).toHaveURL(/currency=USD/);
	await expect(filtersButton(page)).toContainText('2');
});

test('the categories kind filter keeps kind-less categories and counts', async ({ page }) => {
	await page.goto('/categories');
	await page.waitForLoadState('networkidle'); // hydration guard: the Filtros drawer needs JS
	const dialog = await openFilters(page);
	await dialog.getByText('Gastos', { exact: true }).click();
	await expect(page).toHaveURL(/kind=outcome/);
	await expect(page.getByText('Supermercado', { exact: true })).toBeVisible();
	await expect(page.getByText('Regalos', { exact: true })).toBeVisible();
	await expect(page.getByText('Sueldo', { exact: true })).toHaveCount(0);
	await expect(filtersButton(page)).toContainText('1');

	await page.goto('/categories?kind=income');
	await expect(page.getByText('Sueldo', { exact: true })).toBeVisible();
	await expect(page.getByText('Regalos', { exact: true })).toBeVisible();
	await expect(page.getByText('Supermercado', { exact: true })).toHaveCount(0);
});

test('the movements drawer type control applies on "Ver N movimientos"', async ({ page }) => {
	await page.goto('/movements');
	await page.waitForLoadState('networkidle'); // hydration guard: the Filtros drawer needs JS
	const dialog = await openFilters(page);
	await dialog.getByText('Ingresos', { exact: true }).click();
	// Staged: nothing navigates until the primary action.
	await expect(dialog.getByRole('button', { name: /^Ver( \d+)? movimientos?$/ })).toBeVisible();
	expect(page.url()).not.toMatch(/type=/);
	await dialog.getByRole('button', { name: /^Ver/ }).click();
	await expect(page).toHaveURL(/type=income/);
});
