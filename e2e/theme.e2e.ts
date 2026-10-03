import { expect, test } from '@playwright/test';
import { THEME_COLORS } from '../src/lib/theme';

// Same defaults as scripts/seed.js (local demo user, not a secret).
const email = process.env.SEED_EMAIL || 'demo@gastar.local';
const password = process.env.SEED_PASSWORD || 'demo1234';

test('theme choice persists across reload', async ({ page }) => {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Contraseña').fill(password);
	await page.getByRole('button', { name: 'Ingresar' }).click();
	await expect(page).toHaveURL(/\/$/);

	await page.goto('/profile', { waitUntil: 'networkidle' });
	const html = page.locator('html');
	try {
		await page.getByRole('radio', { name: 'Oscuro' }).check({ force: true });
		await expect(html).toHaveAttribute('data-theme', 'dark');
		await page.reload({ waitUntil: 'networkidle' });
		await expect(html).toHaveAttribute('data-theme', 'dark');
		await expect(page.getByRole('radio', { name: 'Oscuro' })).toBeChecked();
	} finally {
		await page.getByRole('radio', { name: 'Sistema' }).check({ force: true });
		await expect(html).not.toHaveAttribute('data-theme', /.*/);
		await page.reload({ waitUntil: 'networkidle' });
		await expect(html).not.toHaveAttribute('data-theme', /.*/);
	}
});

// Issue #64: a manual choice must win over the OS scheme for both theme-color metas.
for (const [os, choice, label] of [
	['light', 'dark', 'Oscuro'],
	['dark', 'light', 'Claro']
] as const) {
	test.describe(`OS ${os}`, () => {
		test.use({ colorScheme: os });

		test(`theme-color metas follow manual "${choice}" choice`, async ({ page }) => {
			await page.goto('/login', { waitUntil: 'networkidle' });
			await page.getByLabel('Email').fill(email);
			await page.getByLabel('Contraseña').fill(password);
			await page.getByRole('button', { name: 'Ingresar' }).click();
			await expect(page).toHaveURL(/\/$/);

			await page.goto('/profile', { waitUntil: 'networkidle' });
			const html = page.locator('html');
			const metas = page.locator('meta[name="theme-color"]');
			const expected = THEME_COLORS[choice];
			try {
				await page.getByRole('radio', { name: label }).check({ force: true });
				await expect(html).toHaveAttribute('data-theme', choice);
				await expect(metas).toHaveCount(2);
				for (const meta of await metas.all())
					await expect(meta).toHaveAttribute('content', expected);
				await page.reload({ waitUntil: 'networkidle' });
				await expect(metas).toHaveCount(2);
				for (const meta of await metas.all())
					await expect(meta).toHaveAttribute('content', expected);
			} finally {
				await page.getByRole('radio', { name: 'Sistema' }).check({ force: true });
				await expect(html).not.toHaveAttribute('data-theme', /.*/);
				await page.reload({ waitUntil: 'networkidle' });
				await expect(html).not.toHaveAttribute('data-theme', /.*/);
			}
		});
	});
}
