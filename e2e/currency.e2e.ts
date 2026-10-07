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

async function choose(page: Page, label: 'ARS' | 'USD') {
	await page.getByRole('radio', { name: label }).check({ force: true });
	await expect(page.getByRole('radio', { name: label })).toBeChecked();
	// The POST is async; wait for the cookie so a following navigation does not abort it.
	await expect
		.poll(
			async () =>
				(await page.context().cookies()).find((c) => c.name === 'currency')?.value ?? 'ARS'
		)
		.toBe(label);
}

const setCookie = (page: Page, baseURL: string | undefined, value: string) =>
	page.context().addCookies([{ name: 'currency', value, url: baseURL! }]);

// Each test context sets its own cookie; reset it so specs stay independent.
test.afterEach(async ({ context, baseURL }) => {
	await context.addCookies([{ name: 'currency', value: 'ARS', url: baseURL! }]);
});

test('top bar has no currency control', async ({ page }) => {
	await login(page);
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
	await login(page);
	await page.context().clearCookies({ name: 'currency' });
	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'ARS' })).toBeChecked();
});

test('Inicio tab choice survives a reload', async ({ page }) => {
	await login(page);
	await page.goto('/', { waitUntil: 'networkidle' });
	await choose(page, 'USD');
	await page.reload({ waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();
	await expect(page.getByText('Saldo', { exact: true })).toBeVisible();
	await expect(page.getByText('US$').first()).toBeVisible();
});

test('an unknown currency cookie reads as ARS on Inicio', async ({ page, baseURL }) => {
	await login(page);
	await setCookie(page, baseURL, 'EUR');
	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'ARS' })).toBeChecked();
});

test('invalid currency shows one alert under the tabs and clears on success', async ({ page }) => {
	await login(page);
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.getByRole('radio', { name: 'USD' }).evaluate((el) => {
		const input = el as HTMLInputElement;
		input.value = 'invalid';
		input.checked = true;
		input.form!.requestSubmit();
	});
	await expect(page.getByRole('alert')).toHaveText('Moneda inválida.');
	await expect(page.getByRole('alert')).toHaveCount(1);
	await expect(page).toHaveURL(/\/$/);

	await choose(page, 'ARS');
	await expect(page.getByRole('alert')).toHaveCount(0);
});

test('checked tab keeps focus after switching', async ({ page }) => {
	await login(page);
	await page.goto('/', { waitUntil: 'networkidle' });
	await choose(page, 'USD');
	await expect(page.getByRole('radio', { name: 'USD' })).toBeFocused();
});

test('movements ?currency=USD shows only USD amounts', async ({ page }) => {
	await login(page);
	await page.goto('/movements?currency=USD', { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();
	await expect(page.getByText('US$').first()).toBeVisible();
	await expect(page.locator('.list-card').getByText(/^[-+]?\$/)).toHaveCount(0);

	await page.goto('/movements?currency=ARS', { waitUntil: 'networkidle' });
	await expect(page.getByText('$').first()).toBeVisible();
	await expect(page.getByText('US$')).toHaveCount(0);
});

test('an account filter on /movements wins over ?currency=USD', async ({ page }) => {
	await login(page);
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: /Efectivo/ }).click();
	await expect(page).toHaveURL(/\/accounts\/[^/]+$/);
	const id = page.url().split('/').pop()!;
	await page.goto(`/movements?account=${id}&currency=USD`, { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'ARS' })).toBeChecked();
	await expect(page.getByRole('radio', { name: 'ARS' })).toBeDisabled();
	await expect(page.getByText('No hay movimientos')).toHaveCount(0);
});

test('picking an account in the /movements filter applies it', async ({ page }) => {
	await login(page);
	await page.goto('/movements', { waitUntil: 'networkidle' });
	await page.getByText(/^Filtros/).click();
	await page.getByRole('button', { name: /Cuenta/ }).click();
	await page.getByRole('dialog').locator('button.opt', { hasText: 'Efectivo' }).click();
	await expect(page).toHaveURL(/[?&]account=[0-9a-f-]{36}/);
});

test('accounts are grouped into Pesos and Dólares', async ({ page }) => {
	await login(page);
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await expect(page.getByRole('heading', { name: 'Pesos' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Dólares' })).toBeVisible();
	await expect(page.getByText('Efectivo')).toBeVisible();
	await expect(page.getByText('Ahorro USD')).toBeVisible();
});

test('accounts ?currency=USD shows only Dólares', async ({ page }) => {
	await login(page);
	await page.goto('/accounts?currency=USD', { waitUntil: 'networkidle' });
	await expect(page.getByRole('heading', { name: 'Dólares' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Pesos' })).toHaveCount(0);
	await expect(page.getByText('Ahorro USD')).toBeVisible();
	await expect(page.getByText('Efectivo')).toHaveCount(0);
});

test('Inicio "Ver todos" links to the selected currency', async ({ page }) => {
	await login(page);
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
	await login(page);
	const totals = async () =>
		page.locator('.section-head').evaluateAll((els) => els.map((el) => el.textContent?.trim()));
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await expect(page.getByText('Cuenta Santander (cerrada)')).toHaveCount(0);
	const before = await totals();
	await page.goto('/accounts?archived=1', { waitUntil: 'networkidle' });
	await expect(page.getByText('Cuenta Santander (cerrada)')).toBeVisible();
	expect(await totals()).toEqual(before);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('Guardar switches the Inicio currency and the Movimientos filter applies it', async ({
		page
	}) => {
		await login(page);
		await page.goto('/');
		await page.getByRole('radio', { name: 'USD' }).check({ force: true });
		await page.getByRole('button', { name: 'Guardar' }).click();
		await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();

		await page.goto('/movements');
		await page.getByRole('radio', { name: 'USD' }).check({ force: true });
		await page.getByRole('button', { name: 'Filtrar' }).click();
		await expect(page).toHaveURL(/currency=USD/);
		await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();
	});
});

test('movements and accounts ignore the currency cookie', async ({ page, baseURL }) => {
	await login(page);
	await setCookie(page, baseURL, 'USD');
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await expect(page.getByText('Efectivo')).toBeVisible();
	await page.goto('/movements', { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'Ambas' })).toBeChecked();
});
