import { expect, test } from '@playwright/test';
import { firstDetailHref, login } from './helpers';

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
