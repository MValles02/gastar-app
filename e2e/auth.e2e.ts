import { expect, test } from '@playwright/test';
import { SEED_EMAIL, submitLogin } from './helpers';

test('signed-out visit redirects to login', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/login$/);
});

test('wrong password shows an error and creates no session', async ({ page }) => {
	await submitLogin(page, SEED_EMAIL, 'definitely-wrong');
	await expect(page.getByRole('alert')).toBeVisible();
	await expect(page).toHaveURL(/\/login/);
	await page.goto('/');
	await expect(page).toHaveURL(/\/login$/);
});
