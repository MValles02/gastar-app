import { expect, test } from '@playwright/test';
import { SEED_EMAIL, SEED_PASSWORD } from './helpers';

test('signed-out visit redirects to login', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/login$/);
});

test('seeded user logs in and reaches home', async ({ page }) => {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByLabel('Email').fill(SEED_EMAIL);
	await page.getByLabel('Contraseña').fill(SEED_PASSWORD);
	await page.getByRole('button', { name: 'Ingresar' }).click();

	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { level: 1, name: /^Hola, / })).toBeAttached();
});
