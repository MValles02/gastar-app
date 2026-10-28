import { expect, test } from '@playwright/test';
import { login, openFilters, todayInAppTz } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
});

const tabBar = (page: import('@playwright/test').Page) =>
	page.getByRole('navigation', { name: 'Navegación principal' });

test('the tab bar shows on the four tabs only', async ({ page }) => {
	// Walks nine routes; against a reused `pnpm dev`, each first visit compiles the route on demand.
	test.slow();
	for (const path of ['/', '/movements', '/plan', '/reports']) {
		await page.goto(path, { waitUntil: 'networkidle' });
		await expect(tabBar(page), path).toBeVisible();
	}
	await page.goto('/movements', { waitUntil: 'networkidle' });
	const href = await page.locator('main a[href^="/movements/"]').first().getAttribute('href');
	for (const path of [href!, '/notifications', '/profile', '/accounts', '/categories']) {
		await page.goto(path, { waitUntil: 'networkidle' });
		await expect(tabBar(page), path).toHaveCount(0);
	}
});

test('the filter summary counts matches and totals income minus outcome', async ({ page }) => {
	await page.goto('/movements?q=Alquiler&currency=ARS', { waitUntil: 'networkidle' });
	const summary = page.getByRole('status').filter({ hasText: /movimientos?/ });
	await expect(summary).toHaveText(/^\s*\d+\s+movimientos?\s·\s/);
	const count = Number((await summary.innerText()).match(/^\s*(\d+)/)![1]);
	const amounts = await page.locator('.row-amount').allInnerTexts();
	expect(amounts).toHaveLength(count);
	// Every "Alquiler" row is an outcome, so the total is minus the sum of the rows.
	const digits = (s: string) => Number(s.replace(/\D/g, ''));
	const sum = amounts.reduce((a, t) => a + digits(t), 0);
	expect(digits(await summary.locator('.money').innerText())).toBe(sum);
	await expect(summary.locator('.money')).toHaveClass(/outcome/);

	await page.goto('/movements?type=transfer', { waitUntil: 'networkidle' });
	await expect(page.getByRole('status').filter({ hasText: /movimientos?/ })).toHaveText(
		/^\s*\d+\s+movimientos?\s*$/
	);
});

test('the Fechas drawer offers presets, a custom range and a single-day summary', async ({
	page
}) => {
	await page.goto('/movements', { waitUntil: 'networkidle' });
	let dialog = await openFilters(page);
	await dialog.getByRole('button', { name: /Fechas/ }).click();
	const picker = page.getByRole('dialog').last();
	await expect(picker.getByText('Fechas (Rango)')).toBeVisible();
	await picker.getByRole('button', { name: 'Este mes' }).click();
	await expect(page).toHaveURL(new RegExp(`from=${todayInAppTz().slice(0, 7)}-01`));

	await page.goto('/movements', { waitUntil: 'networkidle' });
	dialog = await openFilters(page);
	await dialog.getByRole('button', { name: /Fechas/ }).click();
	await page.getByRole('dialog').last().getByRole('button', { name: 'Personalizado' }).click();
	await expect(page.getByRole('dialog').last().getByRole('grid')).toBeVisible();

	await page.goto('/movements?from=2025-03-14&to=2025-03-14', { waitUntil: 'networkidle' });
	dialog = await openFilters(page);
	const row = dialog.getByRole('button', { name: /Fechas/ });
	await expect(row).toContainText('14/03/2025');
	await expect(row).not.toContainText('–');
});

test('an empty Cuenta filter reads "Todas" with no badge', async ({ page }) => {
	await page.goto('/movements', { waitUntil: 'networkidle' });
	const dialog = await openFilters(page);
	const row = dialog.getByRole('button', { name: /^Cuenta/ });
	await expect(row).toContainText('Todas');
	await expect(row.locator('.badge')).toHaveCount(0);
});

test('detail heroes show the amount without a badge', async ({ page }) => {
	await page.goto('/movements', { waitUntil: 'networkidle' });
	await page.locator('main a[href^="/movements/"]').first().click();
	const hero = page.getByRole('region', { name: 'Monto' });
	await expect(hero).toBeVisible();
	await expect(hero.locator('.badge')).toHaveCount(0);
});
