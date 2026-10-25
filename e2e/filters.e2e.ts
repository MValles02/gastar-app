import { expect, test } from '@playwright/test';
import { login, openFilters } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
});

const filtersButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /^Filtros/ });

test('list pages keep no radio or checkbox outside the Filtros drawer', async ({ page }) => {
	for (const path of ['/movements', '/accounts', '/categories']) {
		await page.goto(path, { waitUntil: 'networkidle' });
		await expect(page.locator('main').getByRole('radio')).toHaveCount(0);
		await expect(page.locator('main').getByRole('checkbox')).toHaveCount(0);
	}
});

test('accounts filters submit on the archived checkbox and the currency control, and count', async ({
	page
}) => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
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

test('account rows show no currency subtitle', async ({ page }) => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await expect(
		page.locator('[data-slot="item-description"]').filter({ hasText: /^(ARS|USD)/ })
	).toHaveCount(0);
});

test('categories filters submit on the archived checkbox', async ({ page }) => {
	await page.goto('/categories', { waitUntil: 'networkidle' });
	const dialog = await openFilters(page);
	await dialog.getByRole('checkbox', { name: 'Mostrar archivadas' }).click();
	await expect(page).toHaveURL(/archived=1/);
	await expect(filtersButton(page)).toContainText('1');
});

test('the categories kind filter keeps kind-less categories and counts', async ({ page }) => {
	await page.goto('/categories', { waitUntil: 'networkidle' });
	const dialog = await openFilters(page);
	await dialog.getByText('Gastos', { exact: true }).click();
	await expect(page).toHaveURL(/kind=outcome/);
	await expect(page.getByText('Supermercado', { exact: true })).toBeVisible();
	await expect(page.getByText('Regalos', { exact: true })).toBeVisible();
	await expect(page.getByText('Sueldo', { exact: true })).toHaveCount(0);
	await expect(filtersButton(page)).toContainText('1');

	await page.goto('/categories?kind=income', { waitUntil: 'networkidle' });
	await expect(page.getByText('Sueldo', { exact: true })).toBeVisible();
	await expect(page.getByText('Regalos', { exact: true })).toBeVisible();
	await expect(page.getByText('Supermercado', { exact: true })).toHaveCount(0);
});

test('keyboard selection on the accounts currency control submits the filter', async ({ page }) => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await openFilters(page);
	await page.getByRole('dialog').locator('[role="radio"][aria-checked="true"]').focus();
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('Space');
	await expect(page).toHaveURL(/currency=/);
});

test('the movements drawer type control applies the filter', async ({ page }) => {
	await page.goto('/movements', { waitUntil: 'networkidle' });
	const dialog = await openFilters(page);
	await dialog.getByText('Ingresos', { exact: true }).click();
	await expect(page).toHaveURL(/type=income/);
});

test('arrow + space on a segmented control navigates once', async ({ page }) => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await openFilters(page);
	let navs = 0;
	let inFlight = 0;
	page.on('framenavigated', () => navs++);
	page.on('request', () => inFlight++);
	page.on('requestfinished', () => inFlight--);
	page.on('requestfailed', () => inFlight--);
	await page.getByRole('dialog').locator('[role="radio"][aria-checked="true"]').focus();
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('Space');
	await expect(page).toHaveURL(/currency=/);
	// Any navigation the key presses started has fetched its data once no request is in flight.
	await expect.poll(() => inFlight).toBe(0);
	expect(navs).toBe(1);
});
