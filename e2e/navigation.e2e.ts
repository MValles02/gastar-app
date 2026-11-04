// Back/up pops history like a native stack instead of pushing the parent again (iOS swipe-back = history.back()).
import { expect, test, type Page } from '@playwright/test';
import { login, OTHER_EMAIL, PHONE, signUpVerified } from './helpers';

test.use({ viewport: PHONE });

const historyLength = (page: Page) => page.evaluate(() => history.length);
const back = (page: Page, label: string) =>
	page.locator('header.top-bar').getByRole('link', { name: label }).click();

test('‹ pops back to the parent: Perfil → Cuentas → cuenta → ‹ → ‹ ends on Perfil', async ({
	page
}) => {
	await login(page);
	await page.goto('/profile');
	await page.waitForLoadState('networkidle'); // hydration guard: client-side navigation needs JS
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

test('saving an edit pops to the detail, so back lands on the list, not the form; Cancelar pops too', async ({
	page
}) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts');
	await page.waitForLoadState('networkidle'); // hydration guard: client-side navigation needs JS
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

	await page
		.getByRole('link', { name: /Otra cuenta pesos/ })
		.first()
		.click();
	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(page).toHaveURL(/\/edit$/);
	await page.getByRole('link', { name: 'Cancelar' }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	await page.goBack();
	await expect(page).toHaveURL(/\/accounts$/);
});

test('Guardar plan from a wizard opened on Inicio leaves no wizard step behind /plan', async ({
	page,
	request,
	baseURL
}) => {
	test.setTimeout(90_000);
	// Its own user (1 sign-up, see signUpVerified): the plan it saves is data no other spec reads.
	await signUpVerified(page, request, {
		email: `e2e+nav-${Date.now()}@gastar.local`,
		password: 'e2e-pass-1234',
		name: 'E2E Navegación'
	});
	const res = await page.request.post('/accounts/new', {
		form: { name: 'Caja', currency: 'ARS', initialBalance: '500', icon: 'bank', color: 'green' },
		headers: { origin: baseURL!, accept: 'text/html' }
	});
	expect(res.ok()).toBe(true);

	await page.goto('/');
	await page.waitForLoadState('networkidle'); // hydration guard: client-side navigation needs JS
	await page
		.getByRole('region', { name: 'Saldo', exact: true })
		.getByRole('link', { name: 'Crear plan' })
		.click();
	await expect(page).toHaveURL(/\/plan\/setup/);
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

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('‹ is still a link to the parent', async ({ page }) => {
		await login(page);
		await page.goto('/accounts');
		await back(page, 'Volver al perfil');
		await expect(page).toHaveURL(/\/profile$/);
	});
});
