import { expect, test, type Page } from '@playwright/test';
import {
	expectNoHorizontalOverflow,
	login,
	MIN_TARGET_PX,
	setCurrencyCookie,
	SMALL_PHONE
} from './helpers';

const norm = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/** The value cell of a Reportes month total ("Ingresos", "Gastos", "Resultado"). */
const total = (page: Page, name: string) =>
	page.locator('dl.totals > div').filter({ hasText: name }).locator('dd');

const amountOf = (s: string | null) => Number(norm(s).replace(/[^\d]/g, ''));

/** Goes `n` months back from the current Reportes month and returns that month (YYYY-MM). */
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

test.beforeEach(async ({ page }) => {
	await login(page);
});

test('tab bar is Inicio, Movimientos, Plan, Reportes plus the Nuevo movimiento button and Profile links to Cuentas and Categorías', async ({
	page
}) => {
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
	for (const url of ['/reports', '/reports?month=' + (await monthsBack(page, 2))]) {
		await page.goto(url, { waitUntil: 'networkidle' });
		const card = page.getByRole('link', { name: /Gasto más grande/ });
		await expect(card).toContainText('$380.000');
		await expect(card).toContainText('Alquiler');
	}
});

for (const currency of ['ARS', 'USD'] as const) {
	test(`${currency} Resultado equals the Inicio month balance`, async ({ page, baseURL }) => {
		await setCurrencyCookie(page, baseURL!, currency);
		// Specs that write current-month movements run as OTHER_EMAIL, so the demo user's month is stable.
		await page.goto('/', { waitUntil: 'networkidle' });
		const inicio = norm(await page.locator('.net').textContent());
		await page.goto('/reports', { waitUntil: 'networkidle' });
		expect(norm(await total(page, 'Resultado').textContent())).toBe(inicio);
	});
}

// The seed has no USD outcomes (USD only receives income and transfers).
test('USD current month shows no spending and no pesos', async ({ page, baseURL }) => {
	await setCurrencyCookie(page, baseURL!, 'USD');
	await page.goto('/reports', { waitUntil: 'networkidle' });
	expect(norm(await total(page, 'Gastos').textContent())).toBe('US$0,00');
	await expect(page.getByText(/^No hay gastos con categoría en /)).toBeVisible();
	expect(norm(await page.locator('main').innerText())).not.toMatch(/(^|[^S])\$ /);
});

test('six month links carry a text equivalent and fit at 320px with 200% text', async ({
	page
}) => {
	await page.setViewportSize(SMALL_PHONE);
	await page.goto('/reports', { waitUntil: 'networkidle' });
	const links = page.locator('ul.bars a');
	await expect(links).toHaveCount(6);
	for (const link of await links.all())
		await expect(link).toHaveAttribute('aria-label', /ingresos .* gastos /);
	await expect(page.locator('ul.bars a[aria-current="true"]')).toHaveCount(1);
	for (const box of await links.evaluateAll((els) =>
		els.map((el) => el.getBoundingClientRect().width)
	))
		expect(box).toBeGreaterThanOrEqual(MIN_TARGET_PX);

	await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
	await expectNoHorizontalOverflow(page);
});

test('switching currency keeps the selected past month', async ({ page }) => {
	const month = await monthsBack(page, 1);
	await page.getByRole('radio', { name: 'USD' }).check({ force: true });
	await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();
	await expect.poll(() => new URL(page.url()).search).toBe(`?month=${month}`);
	await expect(page.locator('ul.bars a[aria-current="true"]')).toHaveCount(1);
});

test('past month totals match its six-month link', async ({ page }) => {
	await monthsBack(page, 1);
	const label = (await page.locator('ul.bars a[aria-current="true"]').getAttribute('aria-label'))!;
	const [, ingresos, gastos] = /ingresos (.*), gastos (.*)$/.exec(norm(label))!;
	// Strip the visually hidden sign Money keeps for screen readers.
	expect(norm(await total(page, 'Ingresos').textContent()).replace(/^\+/, '')).toBe(ingresos);
	expect(norm(await total(page, 'Gastos').textContent()).replace(/^-/, '')).toBe(gastos);
});

// No rounding tolerance needed: the ARS slice amounts are whole pesos (formatMoney shows them exactly) and
// the percentages use largest-remainder rounding, so they always total exactly 100.
test('category slices sum to 100 % and to the month spending', async ({ page }) => {
	await page.goto('/reports', { waitUntil: 'networkidle' });
	const pcts = await page.locator('.slices .pct').allTextContents();
	expect(pcts.length).toBeGreaterThan(0);
	expect(pcts.reduce((a, p) => a + amountOf(p), 0)).toBe(100);
	const amts = await page.locator('.slices .amt').allTextContents();
	const gastos = await total(page, 'Gastos').textContent();
	expect(amts.reduce((a, t) => a + amountOf(t), 0)).toBe(amountOf(gastos));
});

test('Perfil, Categorías and back returns to Perfil', async ({ page }) => {
	await page.getByRole('link', { name: 'Perfil' }).click();
	await expect(page).toHaveURL(/\/profile$/);
	await page.getByRole('link', { name: 'Categorías' }).click();
	await expect(page).toHaveURL(/\/categories$/);
	await page.getByRole('link', { name: 'Volver al perfil' }).click();
	await expect(page).toHaveURL(/\/profile$/);
});

// The seed colours "Alquiler" violet and it is the biggest outcome, so it leads the donut.
test('donut legend dots use the category colour, not their position', async ({ page }) => {
	await page.goto('/reports', { waitUntil: 'networkidle' });
	const row = page.locator('.slices li').filter({ hasText: 'Alquiler' });
	const dot = await row.locator('i').evaluate((el) => getComputedStyle(el).backgroundColor);
	const violet = await page.evaluate(() => {
		const probe = document.createElement('i');
		probe.style.background = 'var(--swatch-violet)';
		document.body.append(probe);
		const color = getComputedStyle(probe).backgroundColor;
		probe.remove();
		return color;
	});
	expect(dot).toBe(violet);
});

for (const [name, viewport] of [
	['320px', SMALL_PHONE],
	['375px', { width: 375, height: 800 }]
] as const) {
	test(`biggest outcome amount stays on one line inside its card at ${name}`, async ({ page }) => {
		await page.setViewportSize(viewport);
		await page.goto('/reports', { waitUntil: 'networkidle' });
		const card = page.getByRole('link', { name: /Gasto más grande/ });
		const amount = card.locator('.fact');
		await expect(amount).toContainText('$380.000');
		const { height, lineHeight, right } = await amount.evaluate((el) => ({
			height: el.getBoundingClientRect().height,
			lineHeight: parseFloat(getComputedStyle(el).lineHeight),
			right: el.scrollWidth + el.getBoundingClientRect().left
		}));
		expect(height).toBeLessThanOrEqual(lineHeight * 1.2);
		expect(right).toBeLessThanOrEqual(
			(await card.boundingBox())!.x + (await card.boundingBox())!.width
		);
		await expectNoHorizontalOverflow(page);
	});
}

test('category legend rows link to the category for the selected month; Otros is not a link', async ({
	page
}) => {
	const month = await monthsBack(page, 2);
	const rows = page.locator('.slices li');
	for (const row of await rows.all()) {
		const link = row.locator('a');
		if ((await row.locator('.name').textContent()) === 'Otros') await expect(link).toHaveCount(0);
		else {
			await expect(link).toHaveAttribute(
				'href',
				new RegExp(`^/categories/[^/?]+\\?month=${month}$`)
			);
			expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(MIN_TARGET_PX);
		}
	}
	const href = (await rows.locator('a').first().getAttribute('href'))!;
	await rows.locator('a').first().click();
	await expect(page).toHaveURL(href);
});
