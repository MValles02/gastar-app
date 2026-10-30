// Back/up pops history like a native stack instead of pushing the parent again (iOS swipe-back = history.back()).
import { expect, test, type Page } from '@playwright/test';
import { login, OTHER_EMAIL, PHONE, setCurrencyCookie } from './helpers';

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
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
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

test('a save that pops refreshes the layout: new name on Perfil and new initials on Inicio', async ({
	page
}) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/profile/name', { waitUntil: 'networkidle' });
	const original = await page.getByLabel('Nombre').inputValue();
	try {
		await page.goto('/', { waitUntil: 'networkidle' });
		await page.getByRole('link', { name: 'Perfil' }).click();
		await expect(page).toHaveURL(/\/profile$/);
		await page.getByRole('link', { name: 'Cambiar nombre' }).click();
		await expect(page).toHaveURL(/\/profile\/name$/);
		await page.getByLabel('Nombre').fill('Zeta Navegación');
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/profile$/);
		await expect(page.locator('.who .name')).toHaveText('Zeta Navegación');

		await back(page, 'Volver al inicio');
		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByRole('link', { name: 'Perfil' })).toHaveText('ZN');
	} finally {
		await page.goto('/profile/name', { waitUntil: 'networkidle' });
		await page.getByLabel('Nombre').fill(original);
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/profile$/);
	}
});

test('a double tap on Cancelar pops once, to the detail, not the list', async ({ page }) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await page
		.getByRole('link', { name: /Otra cuenta pesos/ })
		.first()
		.click();
	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(page).toHaveURL(/\/edit$/);
	// Both clicks land before the first pop does.
	await page.getByRole('link', { name: 'Cancelar' }).evaluate((a: HTMLElement) => {
		a.click();
		a.click();
	});
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	await expect(page.getByRole('link', { name: 'Editar' })).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/\/accounts$/);
});

test('a second ‹ while a slow pop is still loading is ignored', async ({ page }) => {
	await login(page);
	await page.goto('/profile', { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: 'Cuentas' }).click();
	await expect(page).toHaveURL(/\/accounts$/);
	await page.locator('main a[href*="accounts/"]:not([href$="/new"])').first().click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);

	// The list's data takes 2 s, longer than the 1 s fallback timer.
	await page.route('**/accounts/__data.json**', async (route) => {
		await new Promise((r) => setTimeout(r, 2000));
		await route.continue();
	});
	await back(page, 'Volver a cuentas');
	await page.waitForTimeout(1200);
	await back(page, 'Volver a cuentas');

	await expect(page.getByRole('heading', { level: 1, name: 'Cuentas' })).toBeVisible();
	await page.waitForTimeout(500);
	await expect(page).toHaveURL(/\/accounts$/);
});

test('Guardar plan from a wizard opened on Inicio leaves no wizard step behind /plan', async ({
	page,
	baseURL
}) => {
	// Demo has no USD plan (see plan-repeat "Inicio without a plan"); deleted again at the end.
	await login(page);
	await setCurrencyCookie(page, baseURL!, 'USD');
	await page.goto('/', { waitUntil: 'networkidle' });
	await page
		.getByRole('region', { name: 'Saldo', exact: true })
		.getByRole('link', { name: 'Crear plan' })
		.click();
	await expect(page).toHaveURL(/\/plan\/setup/);
	try {
		await page.getByRole('link', { name: 'Siguiente' }).click();
		await expect(page).toHaveURL(/step=2$/);
		await page.getByRole('link', { name: 'Siguiente' }).click();
		await expect(page).toHaveURL(/step=3$/);
		await page.getByRole('button', { name: 'Siguiente' }).click();
		await expect(page).toHaveURL(/step=4$/);
		await page.getByRole('link', { name: 'Siguiente' }).click();
		await expect(page).toHaveURL(/step=5$/);
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Plan guardado.')).toBeVisible();
		await expect(page).toHaveURL(/\/plan$/);

		await page.goBack();
		await expect(page).not.toHaveURL(/\/plan\/setup/);
		await expect(page).toHaveURL(/\/$/);
	} finally {
		await page.goto('/plan', { waitUntil: 'networkidle' });
		const remove = page.getByRole('button', { name: 'Eliminar plan' });
		if (await remove.count()) {
			await remove.click();
			await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
			await expect(page.getByText('Sin plan en dólares')).toBeVisible();
		}
	}
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
