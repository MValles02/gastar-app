import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
	await page.goto('/profile');
	await page.waitForLoadState('networkidle'); // hydration guard: the theme radios apply through JS
	await expect(page.getByRole('radio', { name: 'Oscuro' })).toBeAttached();
});

const themeRadio = (page: Page, name: string) => page.getByRole('radio', { name });

test('theme choice persists across reload', async ({ page }) => {
	const html = page.locator('html');
	try {
		await themeRadio(page, 'Oscuro').check({ force: true });
		await expect(html).toHaveAttribute('data-theme', 'dark');
		await page.reload();
		await expect(html).toHaveAttribute('data-theme', 'dark');
		await expect(themeRadio(page, 'Oscuro')).toBeChecked();
	} finally {
		// Put the theme back to "Sistema" (the default).
		await themeRadio(page, 'Sistema').check({ force: true });
		await expect(html).not.toHaveAttribute('data-theme', /.*/);
	}
});
