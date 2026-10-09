import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('signed-out visit redirects to login', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/login$/);
});

test('seeded user logs in and reaches home', async ({ page }) => {
	await login(page);
	await expect(page.getByRole('heading', { level: 1, name: /^Hola, / })).toBeAttached();
});
