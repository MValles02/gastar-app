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

const norm = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

const setCurrency = (page: Page, baseURL: string | undefined, value: 'ARS' | 'USD') =>
	page.context().addCookies([{ name: 'currency', value, url: baseURL! }]);

// Each test context sets its own cookie; reset it so specs stay independent.
test.afterEach(async ({ context, baseURL }) => {
	await context.addCookies([{ name: 'currency', value: 'ARS', url: baseURL! }]);
});

test('tab bar is Inicio, Movimientos, Plan, Reportes plus the Nuevo movimiento button and Profile links to Cuentas and Categorías', async ({
	page
}) => {
	await login(page);
	await page.goto('/reports', { waitUntil: 'networkidle' });
	const nav = page.getByRole('navigation', { name: 'Navegación principal' });
	const links = nav.getByRole('link');
	await expect(links).toHaveText(['', '', '', '', '']);
	for (const [i, name] of [
		'Inicio',
		'Movimientos',
		'Plan',
		'Reportes',
		'Nuevo movimiento'
	].entries())
		await expect(links.nth(i)).toHaveAccessibleName(name);
	await expect(nav.getByRole('link', { name: 'Nuevo movimiento' })).toHaveAttribute(
		'href',
		'/movements/new'
	);
	await expect(nav.getByRole('link', { name: 'Cuentas' })).toHaveCount(0);
	await expect(nav.getByRole('link', { name: 'Categorías' })).toHaveCount(0);
	const tab = nav.getByRole('link', { name: 'Reportes' });
	await expect(tab).toHaveAttribute('href', '/reports');
	await expect(tab).toHaveAttribute('aria-current', 'page');

	await page.goto('/profile', { waitUntil: 'networkidle' });
	const admin = page.getByRole('navigation', { name: 'Administrar' });
	await expect(admin.getByRole('link')).toHaveText(['Cuentas', 'Categorías']);
	await expect(admin.getByRole('link', { name: 'Cuentas' })).toHaveAttribute('href', '/accounts');
	await expect(admin.getByRole('link', { name: 'Categorías' })).toHaveAttribute(
		'href',
		'/categories'
	);
});

test('a future or invalid month falls back to the current month', async ({ page }) => {
	await login(page);
	await page.goto('/reports', { waitUntil: 'networkidle' });
	const current = norm(await page.locator('.month-label').textContent());
	for (const month of ['2999-01', 'x']) {
		await page.goto(`/reports?month=${month}`, { waitUntil: 'networkidle' });
		await expect(page.locator('.month-label')).toHaveText(current);
		await expect(page.getByLabel('Mes siguiente')).toHaveAttribute('aria-disabled', 'true');
	}
	await page.getByRole('link', { name: 'Mes anterior' }).click();
	await expect(page).toHaveURL(/\/reports\?month=\d{4}-\d{2}$/);
	const first = page.url();
	await page.getByRole('link', { name: 'Mes anterior' }).click();
	await expect(page).not.toHaveURL(first);
	await expect(page).toHaveURL(/\/reports\?month=\d{4}-\d{2}$/);
	await expect(page.locator('.month-label')).not.toHaveText(current);
});

// The seed puts "Alquiler" (380.000, on the bank account) in each of the last three months,
// clamped to today, and no other outcome comes close.
test('ARS biggest outcome is the rent in the current month and two months back', async ({
	page
}) => {
	await login(page);
	for (const url of ['/reports', '/reports?month=' + (await monthsBack(page, 2))]) {
		await page.goto(url, { waitUntil: 'networkidle' });
		const card = page.getByRole('link', { name: /Gasto más grande/ });
		await expect(card).toContainText('$ 380.000');
		await expect(card).toContainText('Alquiler');
	}
});

async function monthsBack(page: Page, n: number) {
	await page.goto('/reports', { waitUntil: 'networkidle' });
	for (let i = 0; i < n; i++) {
		const before = page.url();
		await page.getByRole('link', { name: 'Mes anterior' }).click();
		await expect(page).not.toHaveURL(before);
		await page.waitForLoadState('networkidle');
	}
	return new URL(page.url()).searchParams.get('month')!;
}

for (const currency of ['ARS', 'USD'] as const) {
	test(`${currency} Resultado equals the Inicio month balance`, async ({ page, baseURL }) => {
		await login(page);
		await setCurrency(page, baseURL, currency);
		await page.goto('/', { waitUntil: 'networkidle' });
		const inicio = norm(await page.locator('.net').textContent());
		await page.goto('/reports', { waitUntil: 'networkidle' });
		const resultado = page
			.locator('dl.totals > div')
			.filter({ hasText: 'Resultado' })
			.locator('dd');
		expect(norm(await resultado.textContent())).toBe(inicio);
	});
}

// The seed has no USD outcomes (USD only receives income and transfers).
test('USD current month shows no spending and no pesos', async ({ page, baseURL }) => {
	await login(page);
	await setCurrency(page, baseURL, 'USD');
	await page.goto('/reports', { waitUntil: 'networkidle' });
	const gastos = page.locator('dl.totals > div').filter({ hasText: 'Gastos' }).locator('dd');
	expect(norm(await gastos.textContent())).toBe('US$ 0,00');
	await expect(page.getByText(/^No hay gastos con categoría en /)).toBeVisible();
	expect(norm(await page.locator('main').innerText())).not.toMatch(/(^|[^S])\$ /);
});

test('six month links carry a text equivalent and fit at 320px with 200% text', async ({
	page
}) => {
	await page.setViewportSize({ width: 320, height: 640 });
	await login(page);
	await page.goto('/reports', { waitUntil: 'networkidle' });
	const links = page.locator('ul.bars a');
	await expect(links).toHaveCount(6);
	for (const link of await links.all())
		await expect(link).toHaveAttribute('aria-label', /ingresos .* gastos /);
	await expect(page.locator('ul.bars a[aria-current="true"]')).toHaveCount(1);
	for (const box of await links.evaluateAll((els) =>
		els.map((el) => el.getBoundingClientRect().width)
	))
		expect(box).toBeGreaterThanOrEqual(44);

	await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
	const { scrollWidth, clientWidth } = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth
	}));
	expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

const amountOf = (s: string | null) => Number(norm(s).replace(/[^\d]/g, ''));

test('switching currency keeps the selected past month', async ({ page }) => {
	await login(page);
	const month = await monthsBack(page, 1);
	await page.getByRole('radio', { name: 'USD' }).check({ force: true });
	await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();
	await expect.poll(() => new URL(page.url()).search).toBe(`?month=${month}`);
	await expect(page.locator('ul.bars a[aria-current="true"]')).toHaveCount(1);
});

test('past month totals match its six-month link', async ({ page }) => {
	await login(page);
	await monthsBack(page, 1);
	const label = (await page.locator('ul.bars a[aria-current="true"]').getAttribute('aria-label'))!;
	const [, ingresos, gastos] = /ingresos (.*), gastos (.*)$/.exec(norm(label))!;
	const dd = (name: string) =>
		page.locator('dl.totals > div').filter({ hasText: name }).locator('dd');
	// Strip the visually hidden sign Money keeps for screen readers.
	expect(norm(await dd('Ingresos').textContent()).replace(/^\+/, '')).toBe(ingresos);
	expect(norm(await dd('Gastos').textContent()).replace(/^-/, '')).toBe(gastos);
});

test('category slices sum to 100 % and to the month spending', async ({ page }) => {
	await login(page);
	await page.goto('/reports', { waitUntil: 'networkidle' });
	const pcts = await page.locator('.slices .pct').allTextContents();
	expect(pcts.length).toBeGreaterThan(0);
	expect(pcts.reduce((a, p) => a + amountOf(p), 0)).toBe(100);
	const amts = await page.locator('.slices .amt').allTextContents();
	const gastos = await page
		.locator('dl.totals > div')
		.filter({ hasText: 'Gastos' })
		.locator('dd')
		.textContent();
	expect(amts.reduce((a, t) => a + amountOf(t), 0)).toBe(amountOf(gastos));
});

test('Perfil, Categorías and back returns to Perfil', async ({ page }) => {
	await login(page);
	await page.getByRole('link', { name: 'Perfil' }).click();
	await expect(page).toHaveURL(/\/profile$/);
	await page.getByRole('link', { name: 'Categorías' }).click();
	await expect(page).toHaveURL(/\/categories$/);
	await page.getByRole('link', { name: 'Volver al perfil' }).click();
	await expect(page).toHaveURL(/\/profile$/);
});
