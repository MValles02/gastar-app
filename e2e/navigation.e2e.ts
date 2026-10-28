// Back/up pops history like a native stack instead of pushing the parent again (iOS swipe-back = history.back()).
import { expect, test, type Page } from '@playwright/test';
import { login, OTHER_EMAIL, PHONE } from './helpers';

test.use({ viewport: PHONE });

const historyLength = (page: Page) => page.evaluate(() => history.length);
const back = (page: Page, label: string) =>
	page.locator('header.top-bar').getByRole('link', { name: label }).click();

test('‹ pops back to the parent: Perfil → Cuentas → cuenta → ‹ → ‹ ends on Perfil', async ({
	page
}) => {
	await login(page);
	await page.goto('/profile', { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: 'Cuentas' }).click();
	await expect(page).toHaveURL(/\/accounts$/);
	await page.locator('main a[href*="accounts/"]:not([href$="/new"])').first().click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	const length = await historyLength(page);

	await back(page, 'Volver a cuentas');
	await expect(page).toHaveURL(/\/accounts$/);
	await back(page, 'Volver al perfil');
	await expect(page).toHaveURL(/\/profile$/);
	expect(await historyLength(page)).toBe(length);

	// The entries we popped are forward history now, not behind Perfil.
	await page.goBack();
	await expect(page).not.toHaveURL(/\/accounts/);
});

test('saving an edit pops to the detail, so back lands on the list, not the form', async ({
	page
}) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await page
		.getByRole('link', { name: /Otra cuenta pesos/ })
		.first()
		.click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(page).toHaveURL(/\/edit$/);
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);

	await page.goBack();
	await expect(page).toHaveURL(/\/accounts$/);
});

test('Cancelar pops back to the detail', async ({ page }) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await page
		.getByRole('link', { name: /Otra cuenta pesos/ })
		.first()
		.click();
	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(page).toHaveURL(/\/edit$/);
	const length = await historyLength(page);
	await page.getByRole('link', { name: 'Cancelar' }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	expect(await historyLength(page)).toBe(length);
	await page.goBack();
	await expect(page).toHaveURL(/\/accounts$/);
});

test('tab taps replace the entry instead of piling up history', async ({ page }) => {
	await login(page);
	const length = await historyLength(page);
	const tabs = page.getByRole('navigation', { name: 'Navegación principal' });
	for (const [name, url] of [
		['Movimientos', /\/movements$/],
		['Plan', /\/plan$/],
		['Reportes', /\/reports$/],
		['Inicio', /\/$/]
	] as const) {
		await tabs.getByRole('link', { name, exact: true }).click();
		await expect(page).toHaveURL(url);
	}
	expect(await historyLength(page)).toBe(length);
});

test('month and currency changes do not add history entries', async ({ page }) => {
	await login(page);
	await page.goto('/reports', { waitUntil: 'networkidle' });
	const length = await historyLength(page);

	await page.getByRole('link', { name: 'Mes anterior' }).click();
	await expect(page).toHaveURL(/month=/);
	await page.getByRole('link', { name: 'Mes siguiente' }).click();
	await expect(page.getByRole('link', { name: 'Mes anterior' })).toBeVisible();

	await page.getByRole('radio', { name: 'USD' }).check({ force: true });
	await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();
	await page.getByRole('radio', { name: 'ARS' }).check({ force: true });
	await expect(page.getByRole('radio', { name: 'ARS' })).toBeChecked();

	expect(await historyLength(page)).toBe(length);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('‹ is still a link to the parent', async ({ page }) => {
		await login(page);
		await page.goto('/accounts');
		await back(page, 'Volver al perfil');
		await expect(page).toHaveURL(/\/profile$/);
	});
});
