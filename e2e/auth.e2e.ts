import { expect, test } from '@playwright/test';
import { login, SEED_EMAIL, submitLogin } from './helpers';

test('signed-out visit redirects to login', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/login$/);
});

test('seeded user logs in and reaches home', async ({ page }) => {
	await login(page);
	await expect(page.getByRole('heading', { level: 1, name: /^Hola, / })).toBeAttached();
});

test('wrong password keeps the email, clears the password and focuses it', async ({ page }) => {
	await submitLogin(page, SEED_EMAIL, 'definitely-wrong');
	const password = page.getByLabel('Contraseña', { exact: true });
	await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible();
	await expect(page.getByLabel('Email')).toHaveValue(SEED_EMAIL);
	await expect(password).toHaveValue('');
	await expect(password).toBeFocused();
});
