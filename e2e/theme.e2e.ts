import { expect, test, type Page } from '@playwright/test';
import { THEME_COLORS } from '../src/lib/theme';
import { login } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
	await page.goto('/profile', { waitUntil: 'networkidle' });
});

const themeRadio = (page: Page, name: string) => page.getByRole('radio', { name });

/** Puts the theme back to "Sistema" (the default) and checks it sticks across a reload. */
async function resetTheme(page: Page) {
	const html = page.locator('html');
	await themeRadio(page, 'Sistema').check({ force: true });
	await expect(html).not.toHaveAttribute('data-theme', /.*/);
	await page.reload({ waitUntil: 'networkidle' });
	await expect(html).not.toHaveAttribute('data-theme', /.*/);
}

test('theme choice persists across reload', async ({ page }) => {
	const html = page.locator('html');
	try {
		await themeRadio(page, 'Oscuro').check({ force: true });
		await expect(html).toHaveAttribute('data-theme', 'dark');
		await page.reload({ waitUntil: 'networkidle' });
		await expect(html).toHaveAttribute('data-theme', 'dark');
		await expect(themeRadio(page, 'Oscuro')).toBeChecked();
	} finally {
		await resetTheme(page);
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
			const metas = page.locator('meta[name="theme-color"]');
			const expectMetas = async () => {
				await expect(metas).toHaveCount(2);
				for (const meta of await metas.all())
					await expect(meta).toHaveAttribute('content', THEME_COLORS[choice]);
			};
			try {
				await themeRadio(page, label).check({ force: true });
				await expect(page.locator('html')).toHaveAttribute('data-theme', choice);
				await expectMetas();
				await page.reload({ waitUntil: 'networkidle' });
				await expectMetas();
			} finally {
				await resetTheme(page);
			}
		});
	});
}
