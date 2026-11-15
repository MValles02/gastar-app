import { expect, test, type Page } from '@playwright/test';
import { login, openFilters, setCurrencyCookie } from './helpers';

/** Inicio switches currency with the Pesos / Dólares pills (toggle buttons). */
const USD_AMOUNT = /^\s*US\$\s?[\d.]+,\d{2}\s*$/;
const PILL = { ARS: 'Pesos', USD: 'Dólares' } as const;
const pill = (page: Page, label: 'ARS' | 'USD') =>
	page.getByRole('button', { name: PILL[label], exact: true });

async function choose(page: Page, label: 'ARS' | 'USD') {
	await pill(page, label).click();
	await expect(pill(page, label)).toHaveAttribute('aria-pressed', 'true');
	// The POST is async; wait for the cookie so a following navigation does not abort it.
	await expect
		.poll(
			async () =>
				(await page.context().cookies()).find((c) => c.name === 'currency')?.value ?? 'ARS'
		)
		.toBe(label);
}

test.beforeEach(async ({ page }) => {
	await login(page);
});

test('Inicio tab choice survives a reload and an unknown cookie reads as ARS', async ({
	page,
	baseURL
}) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle'); // hydration guard: the currency tabs post through JS
	await choose(page, 'USD');
	await page.reload();
	await expect(pill(page, 'USD')).toHaveAttribute('aria-pressed', 'true');
	// The seed gives demo's USD account random movements: the balance has no fixed literal, only USD format.
	await expect(page.locator('.col', { hasText: 'Saldo total' }).locator('.am')).toHaveText(
		USD_AMOUNT
	);

	await setCurrencyCookie(page, baseURL!, 'EUR');
	await page.reload();
	await expect(pill(page, 'ARS')).toHaveAttribute('aria-pressed', 'true');
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
});

test('an account filter on /movements wins over ?currency=USD', async ({ page }) => {
	await page.goto('/accounts');
	await page.getByRole('link', { name: /Efectivo/ }).click();
	await expect(page).toHaveURL(/\/accounts\/[^/]+$/);
	const id = page.url().split('/').pop()!;
	await page.goto(`/movements?account=${id}&currency=USD`);
	await page.waitForLoadState('networkidle'); // hydration guard: the filters dialog is JS-only
	const dialog = await openFilters(page);
	await expect(dialog.getByRole('radio', { name: 'Pesos' })).toBeChecked();
	await expect(dialog.getByRole('radio', { name: 'Pesos' })).toBeDisabled();
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
