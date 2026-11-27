import { expect, test, type Cookie, type Page } from '@playwright/test';
import {
	createAccount,
	createVia,
	monthDay,
	post,
	setCurrencyCookie,
	signUpVerified
} from './helpers';

// One signed-up user (1 sign-up) with known movements, so every figure is a literal.
// This month: income $100.000, outcomes $30.000 (Comida) and $10.000 (Varios); US$100,00 in, US$25,50 out.
// Last month: income $50.000, outcome $20.000.
let cookies: Cookie[] = [];

test.beforeAll(async ({ browser, baseURL }) => {
	const context = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		await signUpVerified(page, context.request, {
			email: `e2e+reportes-${Date.now()}@gastar.local`,
			password: 'e2e-pass-1234',
			name: 'E2E Reportes'
		});
		const ars = await createAccount(page, baseURL!, 'Caja rep', 'ARS');
		const usd = await createAccount(page, baseURL!, 'Dólares rep', 'USD');
		const category = (name: string, kind: string) =>
			createVia(page, baseURL!, '/categories/new', { name, color: 'green', icon: 'tag', kind });
		const food = await category('Comida rep', 'outcome');
		const misc = await category('Varios rep', 'outcome');
		const pay = await category('Cobro rep', 'income');
		const thisMonth = monthDay(1, 1);
		const lastMonth = monthDay(2);
		for (const [type, amount, description, accountId, categoryId, occurredAt] of [
			['income', '100.000', 'Sueldo rep', ars, pay, thisMonth],
			['outcome', '30.000', 'Super rep', ars, food, thisMonth],
			['outcome', '10.000', 'Kiosco rep', ars, misc, thisMonth],
			['income', '50.000', 'Sueldo previo rep', ars, pay, lastMonth],
			['outcome', '20.000', 'Super previo rep', ars, food, lastMonth],
			['income', '100,00', 'Cobro USD rep', usd, pay, thisMonth],
			['outcome', '25,50', 'Gasto USD rep', usd, food, thisMonth]
		]) {
			const res = await post(page, baseURL!, '/movements/new', {
				type,
				amount,
				description,
				accountId,
				categoryId,
				occurredAt
			});
			expect(res.ok()).toBe(true);
		}
		cookies = await context.cookies();
	} finally {
		await context.close();
	}
});

test.beforeEach(async ({ page }) => {
	await page.context().addCookies(cookies);
});

/** The value cell of a Reportes month total ("Ingresos", "Gastos", "Resultado"). */
const total = (page: Page, name: string) =>
	page.locator('dl.totals > div').filter({ hasText: name }).locator('dd');

test('the biggest outcome is the month’s own', async ({ page }) => {
	await page.goto('/reports');
	const card = page.getByRole('link', { name: /Gasto más grande/ });
	await expect(card).toContainText('$30.000');
	await expect(card).toContainText('Super rep');

	await page.goto(`/reports?month=${monthDay(2).slice(0, 7)}`);
	await expect(card).toContainText('$20.000');
	await expect(card).toContainText('Super previo rep');
});

test('month totals in ARS and USD, last month by URL, and category slice amounts', async ({
	page,
	baseURL
}) => {
	await page.goto('/reports');
	await expect(total(page, 'Ingresos')).toContainText('$100.000');
	await expect(total(page, 'Gastos')).toContainText('$40.000');
	await expect(total(page, 'Resultado')).toContainText('$60.000');
	const slice = (name: string) =>
		page
			.locator('section[aria-labelledby="cat-heading"] [role="listitem"]')
			.filter({ hasText: name });
	await expect(slice('Comida rep')).toContainText('$30.000');
	await expect(slice('Varios rep')).toContainText('$10.000');

	await page.goto(`/reports?month=${monthDay(2).slice(0, 7)}`);
	await expect(total(page, 'Ingresos')).toContainText('$50.000');
	await expect(total(page, 'Gastos')).toContainText('$20.000');

	await setCurrencyCookie(page, baseURL!, 'USD');
	await page.goto('/reports');
	await expect(total(page, 'Ingresos')).toContainText('US$100,00');
	await expect(total(page, 'Gastos')).toContainText('US$25,50');
	await expect(total(page, 'Resultado')).toContainText('US$74,50');
});
