import { expect, test, type Page } from '@playwright/test';

// Same defaults as scripts/seed.js (local demo user, not a secret).
const email = process.env.SEED_EMAIL || 'demo@gastar.local';
const password = process.env.SEED_PASSWORD || 'demo1234';

async function login(page: Page) {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Contraseña').fill(password);
	await page.getByRole('button', { name: 'Ingresar' }).click();
	await expect(page).toHaveURL(/\/$/);
}

async function choose(page: Page, label: 'ARS' | 'USD' | 'Ambas') {
	await page.getByRole('radio', { name: label }).check({ force: true });
	await expect(page.getByRole('radio', { name: label })).toBeChecked();
	// The POST is async; wait for the cookie so a following navigation does not abort it.
	// A missing cookie means the default (both).
	const value = { ARS: 'ARS', USD: 'USD', Ambas: 'both' }[label];
	await expect
		.poll(
			async () =>
				(await page.context().cookies()).find((c) => c.name === 'currency')?.value ?? 'both'
		)
		.toBe(value);
}

// Each test context sets its own cookie; reset it so specs stay independent.
test.afterEach(async ({ context, baseURL }) => {
	await context.addCookies([{ name: 'currency', value: 'both', url: baseURL! }]);
});

test('USD hides ARS accounts on /accounts', async ({ page }) => {
	await login(page);
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await expect(page.getByText('Efectivo')).toBeVisible();
	await choose(page, 'USD');
	await expect(page.getByText('Ahorro USD')).toBeVisible();
	await expect(page.getByText('Efectivo')).toHaveCount(0);
});

test('Ambas shows both currency blocks on /', async ({ page }) => {
	await login(page);
	await page.goto('/', { waitUntil: 'networkidle' });
	await choose(page, 'Ambas');
	await expect(page.getByText('Saldo total ARS')).toBeVisible();
	await expect(page.getByText('Saldo total USD')).toBeVisible();
});

test('currency choice survives a reload', async ({ page }) => {
	await login(page);
	await page.goto('/', { waitUntil: 'networkidle' });
	await choose(page, 'USD');
	await page.reload({ waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();
	await expect(page.getByText('Saldo total')).toBeVisible();
	await expect(page.getByText('Saldo total ARS')).toHaveCount(0);
});

test('the control is present on every main page', async ({ page }) => {
	await login(page);
	for (const path of ['/', '/accounts', '/movements', '/categories', '/profile']) {
		await page.goto(path, { waitUntil: 'networkidle' });
		await expect(page.getByRole('radio', { name: 'ARS' })).toHaveCount(1);
		await expect(page.getByRole('radio', { name: 'USD' })).toHaveCount(1);
		await expect(page.getByRole('radio', { name: 'Ambas' })).toHaveCount(1);
	}
});

test('choice on one page persists on another', async ({ page }) => {
	await login(page);
	await page.goto('/', { waitUntil: 'networkidle' });
	await choose(page, 'USD');
	await page.goto('/movements', { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();
	await page.goto('/categories', { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();
});

test('the checked radio keeps keyboard focus after switching', async ({ page }) => {
	await login(page);
	await page.goto('/', { waitUntil: 'networkidle' });
	await choose(page, 'USD');
	await expect(page.getByRole('radio', { name: 'USD' })).toBeFocused();
});

test('an account filter on /movements wins over the USD selection', async ({ page }) => {
	await login(page);
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: /Efectivo/ }).click();
	await expect(page).toHaveURL(/\/accounts\/[^/]+$/);
	const id = page.url().split('/').pop()!;
	await page.goto('/movements', { waitUntil: 'networkidle' });
	await choose(page, 'USD');
	await page.goto(`/movements?account=${id}`, { waitUntil: 'networkidle' });
	await expect(page.getByText('Efectivo').first()).toBeVisible();
	await expect(page.getByText('No hay movimientos')).toHaveCount(0);
});

test('the old currency filters are gone from /accounts and /movements', async ({ page }) => {
	await login(page);
	for (const path of ['/accounts', '/movements']) {
		await page.goto(path, { waitUntil: 'networkidle' });
		// Only the global control remains: a single radiogroup, no currency combobox.
		await expect(page.getByRole('radiogroup')).toHaveCount(1);
		await expect(page.getByRole('combobox', { name: /moneda/i })).toHaveCount(0);
	}
});
