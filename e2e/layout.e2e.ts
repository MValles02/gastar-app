import { expect, test, type Page } from '@playwright/test';
import { firstDetailHref, login, pathOf } from './helpers';

const backLink = (page: Page) =>
	page.locator('header.top-bar a[aria-label^="Volver"], header.top-bar a[aria-label="Cerrar"]');

test('category detail navigates months', async ({ page }) => {
	await login(page);
	const href = await firstDetailHref(page, 'categories');
	expect(href).not.toBeNull();
	await page.goto('/categories');
	await page.locator(`main a[href="${href}"]`).click();
	await expect(page).toHaveURL(/\/categories\/[^/?]+$/);
	const label = page.locator('.month-label');
	const before = await label.textContent();
	await expect(page.locator('a[aria-label="Mes siguiente"]')).toHaveCount(0);
	await expect(page.getByLabel('Mes siguiente')).toHaveAttribute('aria-disabled', 'true');
	await page.getByRole('link', { name: 'Mes anterior' }).click();
	await expect(page).toHaveURL(/\?month=\d{4}-\d{2}$/);
	await expect(label).not.toHaveText(before!);
});

test('back links go up to a fixed parent and tabs have none', async ({ page }) => {
	await login(page);
	for (const tab of ['/', '/movements', '/plan', '/reports']) {
		await page.goto(tab);
		await expect(backLink(page), tab).toHaveCount(0);
	}
	const account = await firstDetailHref(page, 'accounts');
	const category = await firstDetailHref(page, 'categories');
	const movement = await firstDetailHref(page, 'movements');
	await page.goto('/plan');
	const ruleHref = await pathOf(
		page.locator('main a[href*="/plan/recurring/"]:not([href*="/new"])').first()
	);
	expect(account && category && movement && ruleHref).toBeTruthy();
	const rows: [string, string][] = [
		['/profile', '/'],
		['/notifications', '/'],
		['/accounts', '/profile'],
		['/categories', '/profile'],
		['/plan/recurring/new', '/plan'],
		[ruleHref, '/plan'],
		[`${ruleHref}/edit`, ruleHref],
		['/accounts/new', '/accounts'],
		['/categories/new', '/categories'],
		['/movements/new', '/'],
		[account!, '/accounts'],
		[`${account}/edit`, account!],
		[category!, '/categories'],
		[`${category}/edit`, category!],
		[movement!, '/movements']
	];
	for (const [url, back] of rows) {
		await page.goto(url);
		expect(await pathOf(backLink(page)), url).toBe(back);
	}
});
