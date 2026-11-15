import { expect, test, type Page } from '@playwright/test';
import { login, setCurrencyCookie } from './helpers';

const norm = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/** The value cell of a Reportes month total ("Ingresos", "Gastos", "Resultado"). */
const total = (page: Page, name: string) =>
	page.locator('dl.totals > div').filter({ hasText: name }).locator('dd');

const amountOf = (s: string | null) => Number(norm(s).replace(/[^\d]/g, ''));

/** The category rows (ListRow items) under the "Categorías" heading. */
const rows = (page: Page) =>
	page.locator('section[aria-labelledby="cat-heading"] [role="listitem"]');

/** Goes `n` months back from the current Reportes month and returns that month (YYYY-MM). */
async function monthsBack(page: Page, n: number) {
	await page.goto('/reports');
	for (let i = 0; i < n; i++) {
		const before = page.url();
		await page.getByRole('link', { name: 'Mes anterior' }).click();
		await expect(page).not.toHaveURL(before);
	}
	return new URL(page.url()).searchParams.get('month')!;
}

test.beforeEach(async ({ page }) => {
	await login(page);
});

// The seed puts "Alquiler" (380.000, on the bank account) in each of the last three months,
// clamped to today, and no other outcome comes close.
test('ARS biggest outcome is the rent in the current month and two months back', async ({
	page
}) => {
	for (const url of ['/reports', '/reports?month=' + (await monthsBack(page, 2))]) {
		await page.goto(url);
		const card = page.getByRole('link', { name: /Gasto más grande/ });
		await expect(card).toContainText('$380.000');
		await expect(card).toContainText('Alquiler');
	}
});

test('Resultado equals the Inicio month balance in ARS and USD', async ({ page, baseURL }) => {
	for (const currency of ['ARS', 'USD'] as const) {
		await setCurrencyCookie(page, baseURL!, currency);
		// Specs that write current-month movements run as OTHER_EMAIL, so the demo user's month is stable.
		await page.goto('/');
		const inicio = norm(await page.locator('.net').textContent());
		await page.goto('/reports');
		expect(norm(await total(page, 'Resultado').textContent())).toBe(inicio);
	}
	// The seed has no USD outcomes (USD only receives income and transfers): no spending, no pesos.
	expect(norm(await total(page, 'Gastos').textContent())).toBe('US$0,00');
	expect(norm(await page.locator('main').innerText())).not.toMatch(/(^|[^S])\$ /);
});

test('past month totals match its six-month link; tapping a bar opens its month', async ({
	page
}) => {
	await monthsBack(page, 1);
	const selected = page.locator('ul.bars a[aria-current="true"]');
	const totalsMatch = async () => {
		const label = (await selected.getAttribute('aria-label'))!;
		const [, ingresos, gastos] = /ingresos (.*), gastos (.*)$/.exec(norm(label))!;
		// Strip the visually hidden sign Money keeps for screen readers.
		expect(norm(await total(page, 'Ingresos').textContent()).replace(/^\+/, '')).toBe(ingresos);
		expect(norm(await total(page, 'Gastos').textContent()).replace(/^-/, '')).toBe(gastos);
	};
	await totalsMatch();

	// The bar before the selected one: the seed only has data in the last three months, and a
	// six-month window without movements shows no chart.
	const href = (await page.locator('ul.bars a').nth(-2).getAttribute('href'))!;
	const month = new URL(href, page.url()).searchParams.get('month')!;
	await page.locator(`ul.bars a[href="${href}"]`).click();
	const bar = page.locator(`ul.bars a[href="${href}"]`);
	await expect(page).toHaveURL(new RegExp(`\\?month=${month}$`));
	await expect(bar).toHaveAttribute('aria-current', 'true');
	await totalsMatch();
});

// No rounding tolerance needed: the ARS slice amounts are whole pesos (formatMoney shows them exactly) and
// the percentages use largest-remainder rounding, so they always total exactly 100.
test('category slices sum to 100 % and to the month spending', async ({ page }) => {
	await page.goto('/reports');
	const pcts = await rows(page).locator('.pct').allTextContents();
	expect(pcts.length).toBeGreaterThan(0);
	expect(pcts.reduce((a, p) => a + amountOf(p), 0)).toBe(100);
	const amts = await rows(page).locator('.row-amount > .money').allTextContents();
	const gastos = await total(page, 'Gastos').textContent();
	expect(amts.reduce((a, t) => a + amountOf(t), 0)).toBe(amountOf(gastos));
});
