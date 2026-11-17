import { expect, test } from '@playwright/test';
import { login, openFilters } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
});

test('movements ?currency=USD shows only USD amounts', async ({ page }) => {
	await page.goto('/movements?currency=USD');
	await page.waitForLoadState('networkidle'); // hydration guard: the filters dialog is JS-only
	await expect(page.getByRole('button', { name: /^Filtros/ })).toContainText('1');
	const dialog = await openFilters(page);
	await expect(dialog.getByRole('radio', { name: 'Dólares' })).toBeChecked();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(page.getByText('US$').first()).toBeVisible();
	await expect(page.locator('[data-slot="item-group"]').getByText(/^[-+]?\$/)).toHaveCount(0);

	await page.goto('/movements?currency=ARS');
	await expect(page.getByText('$').first()).toBeVisible();
	// A cross-currency transfer lists its destination amount (US$) under the pesos amount.
	await expect(page.locator('.row-amount > .money').getByText('US$')).toHaveCount(0);

	// An account filter wins over ?currency=USD.
	await page.goto('/accounts');
	await page.getByRole('link', { name: /Efectivo/ }).click();
	await expect(page).toHaveURL(/\/accounts\/[^/]+$/);
	const id = page.url().split('/').pop()!;
	await page.goto(`/movements?account=${id}&currency=USD`);
	await page.waitForLoadState('networkidle'); // hydration guard: the filters dialog is JS-only
	const accountDialog = await openFilters(page);
	await expect(accountDialog.getByRole('radio', { name: 'Pesos' })).toBeChecked();
	await expect(accountDialog.getByRole('radio', { name: 'Pesos' })).toBeDisabled();
	const rows = page.locator('main a[href^="/movements/"]');
	await page.keyboard.press('Escape');
	const filtered = await rows.count();
	expect(filtered).toBeGreaterThan(0);
	await page.goto(`/movements?account=${id}`);
	await expect(rows).toHaveCount(filtered);
});

test('accounts are grouped by currency, ?currency=USD shows only Dólares, archived ones only on request', async ({
	page
}) => {
	await page.goto('/accounts');
	const ars = page.locator('section[aria-labelledby="group-ARS"]');
	const usd = page.locator('section[aria-labelledby="group-USD"]');
	for (const name of ['Efectivo', 'Banco Galicia', 'Mercado Pago'])
		await expect(ars).toContainText(name);
	await expect(usd).toContainText('Ahorro USD');
	await expect(page.getByText('Cuenta Santander (cerrada)')).toHaveCount(0);

	await page.goto('/accounts?currency=USD');
	await expect(usd).toContainText('Ahorro USD');
	await expect(ars).toHaveCount(0);

	await page.goto('/accounts?archived=1');
	// scripts/seed.js: the archived account's only movement is the 22.000 gym payment.
	await expect(
		ars.locator('[role="listitem"]', { hasText: 'Cuenta Santander (cerrada)' })
	).toContainText('-$22.000');
});
