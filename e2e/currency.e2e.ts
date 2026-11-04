import { expect, test, type Page } from '@playwright/test';
import { login, openFilters, setCurrencyCookie } from './helpers';

/** Inicio switches currency with the Pesos / Dólares pills (toggle buttons). */
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

test('top bar has no currency control', async ({ page }) => {
	for (const path of [
		'/',
		'/accounts',
		'/movements',
		'/categories',
		'/reports',
		'/plan',
		'/profile'
	]) {
		await page.goto(path, { waitUntil: 'networkidle' });
		await expect(page.locator('header').getByRole('radio')).toHaveCount(0);
	}
});

test('Inicio defaults to ARS without a cookie', async ({ page }) => {
	await page.context().clearCookies({ name: 'currency' });
	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(pill(page, 'ARS')).toHaveAttribute('aria-pressed', 'true');
});

test('Inicio tab choice survives a reload', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await choose(page, 'USD');
	await page.reload({ waitUntil: 'networkidle' });
	await expect(pill(page, 'USD')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByText('Saldo total', { exact: true })).toBeVisible();
	await expect(page.getByText('US$').first()).toBeVisible();
});

test('an unknown currency cookie reads as ARS on Inicio', async ({ page, baseURL }) => {
	await setCurrencyCookie(page, baseURL!, 'EUR');
	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(pill(page, 'ARS')).toHaveAttribute('aria-pressed', 'true');
});

test('invalid currency shows one alert under the tabs and clears on success', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page
		.locator('button[name="currency"]')
		.first()
		.evaluate((el) => {
			const button = el as HTMLButtonElement;
			button.value = 'invalid';
			button.form!.requestSubmit(button);
		});
	await expect(page.getByRole('alert')).toHaveText('Moneda inválida.');
	await expect(page.getByRole('alert')).toHaveCount(1);
	await expect(page).toHaveURL(/\/$/);

	await choose(page, 'USD');
	await expect(page.getByRole('alert')).toHaveCount(0);
});

test('checked tab keeps focus after switching', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await choose(page, 'USD');
	await expect(pill(page, 'USD')).toBeFocused();
});

test('movements ?currency=USD shows only USD amounts', async ({ page }) => {
	await page.goto('/movements?currency=USD', { waitUntil: 'networkidle' });
	await expect(page.getByRole('button', { name: /^Filtros/ })).toContainText('1');
	const dialog = await openFilters(page);
	await expect(dialog.getByRole('radio', { name: 'Dólares' })).toBeChecked();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(page.getByText('US$').first()).toBeVisible();
	await expect(page.locator('[data-slot="item-group"]').getByText(/^[-+]?\$/)).toHaveCount(0);

	await page.goto('/movements?currency=ARS', { waitUntil: 'networkidle' });
	await expect(page.getByText('$').first()).toBeVisible();
	// A cross-currency transfer lists its destination amount (US$) under the pesos amount.
	await expect(page.locator('.row-amount > .money').getByText('US$')).toHaveCount(0);
});

test('an account filter on /movements wins over ?currency=USD', async ({ page }) => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: /Efectivo/ }).click();
	await expect(page).toHaveURL(/\/accounts\/[^/]+$/);
	const id = page.url().split('/').pop()!;
	await page.goto(`/movements?account=${id}&currency=USD`, { waitUntil: 'networkidle' });
	const dialog = await openFilters(page);
	await expect(dialog.getByRole('radio', { name: 'Pesos' })).toBeChecked();
	await expect(dialog.getByRole('radio', { name: 'Pesos' })).toBeDisabled();
	await expect(page.getByText('No hay movimientos')).toHaveCount(0);
});

test('picking an account in the /movements filter applies it on "Ver"', async ({ page }) => {
	await page.goto('/movements', { waitUntil: 'networkidle' });
	const dialog = await openFilters(page);
	await dialog.getByRole('button', { name: /^Cuenta/ }).click();
	await page.getByRole('dialog').last().locator('button.opt', { hasText: 'Efectivo' }).click();
	await page.keyboard.press('Escape');
	expect(page.url()).not.toContain('account=');
	await dialog.getByRole('button', { name: /^Ver/ }).click();
	await expect(page).toHaveURL(/[?&]account=[0-9a-f-]{36}/);
});

test('accounts are grouped into ARS and USD', async ({ page }) => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await expect(page.getByRole('heading', { name: 'ARS', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'USD', exact: true })).toBeVisible();
	await expect(page.getByText('Efectivo')).toBeVisible();
	await expect(page.getByText('Ahorro USD')).toBeVisible();
});

test('accounts ?currency=USD shows only USD', async ({ page }) => {
	await page.goto('/accounts?currency=USD', { waitUntil: 'networkidle' });
	await expect(page.getByRole('heading', { name: 'USD', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'ARS', exact: true })).toHaveCount(0);
	await expect(page.getByText('Ahorro USD')).toBeVisible();
	await expect(page.getByText('Efectivo')).toHaveCount(0);
});

test('Inicio "Ver todos" links to the selected currency', async ({ page }) => {
	for (const c of ['ARS', 'USD'] as const) {
		await page.goto('/', { waitUntil: 'networkidle' });
		await choose(page, c);
		await expect(page.getByRole('link', { name: 'Ver todos' })).toHaveAttribute(
			'href',
			`/movements?currency=${c}`
		);
	}
});

test('archived accounts are listed without changing the group totals', async ({ page }) => {
	const totals = async () =>
		page.locator('.section-head').evaluateAll((els) => els.map((el) => el.textContent?.trim()));
	// Other workers briefly write the demo user's ARS data: read both pages again until they agree.
	await expect(async () => {
		await page.goto('/accounts', { waitUntil: 'networkidle' });
		await expect(page.getByText('Cuenta Santander (cerrada)')).toHaveCount(0);
		const before = await totals();
		await page.goto('/accounts?archived=1', { waitUntil: 'networkidle' });
		await expect(page.getByText('Cuenta Santander (cerrada)')).toBeVisible();
		expect(await totals()).toEqual(before);
	}).toPass({ timeout: 20_000 });
});

test('movements and accounts ignore the currency cookie', async ({ page, baseURL }) => {
	await setCurrencyCookie(page, baseURL!, 'USD');
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await expect(page.getByText('Efectivo')).toBeVisible();
	await page.goto('/movements', { waitUntil: 'networkidle' });
	const dialog = await openFilters(page);
	await expect(dialog.getByRole('radio', { name: 'Ambas' })).toBeChecked();
});
