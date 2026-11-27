// A drawer URL loaded directly (notification, email, new tab) opens its parent screen with the drawer over it.
import { expect, test } from '@playwright/test';
import { gotoHydrated, login, pathOf } from './helpers';

test('a direct load of a movement URL opens it over /movements and closes back to it', async ({
	page
}) => {
	await login(page);
	await gotoHydrated(page, '/movements');
	const row = page.locator('main li', { has: page.locator('a[href*="movements/"]') }).first();
	const href = await pathOf(row.locator('a[href*="movements/"]').first());
	const description = (await row.locator('.title').first().innerText()).trim();

	await gotoHydrated(page, href);
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(dialog).toContainText(description);
	expect(new URL(page.url()).pathname).toBe('/movements');
	expect(new URL(page.url()).searchParams.has('drawer')).toBe(false);

	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);
	expect(new URL(page.url()).pathname).toBe('/movements');
});
