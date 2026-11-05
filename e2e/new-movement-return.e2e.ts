// The /movements/new full page (deep link, in-app link, no JS) returns to the screen it was opened from,
// popping the form (history does not grow), with a "Movimiento guardado." toast whose only action is
// "Deshacer". The + button opens a drawer instead (new-movement-drawer.e2e.ts). Without JS the action
// redirects to the same origin (from the Referer); anything else falls back to the form itself.
import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	fillRate,
	login,
	OTHER_EMAIL,
	pick,
	PHONE,
	todayInAppTz
} from './helpers';

test.use({ viewport: PHONE });

// Descriptions of movements this spec may have created; removed in afterEach.
const created: string[] = [];
const unique = (prefix: string) => {
	const d = `${prefix} ${Date.now()}`;
	created.push(d);
	return d;
};

test.beforeEach(async ({ page }) => {
	// Not the demo user: other specs read its totals and newest movements while this one writes.
	await login(page, OTHER_EMAIL);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
});

const pathname = (page: Page) => new URL(page.url()).pathname;
// .first(): a duplicate toast must not fail a test (strict mode); the count is asserted where it matters.
const toast = (page: Page) =>
	page.locator('[data-sonner-toast]', { hasText: 'Movimiento guardado.' }).first();

/** Waits out the page transition: while one runs, the browser hit-tests the whole page as <html>. */
const settled = (page: Page) =>
	page.waitForFunction(
		() => !(document as Document & { activeViewTransition?: unknown }).activeViewTransition,
		null,
		{ polling: 'raf' }
	);

/** Fills the open new-movement form with a 1-peso outcome (JS pickers) and saves it. */
async function fillAndSave(page: Page, description: string) {
	await expect(page).toHaveURL(/\/movements\/new$/);
	await settled(page);
	await page.locator('input[name="amount"]').fill('1');
	await page.locator('input[name="description"]').fill(description);
	await pick(page, 'Cuenta', 'Otra cuenta pesos');
	await pick(page, 'Categoría', 'Ajena');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
}

/** Opens the full-page form like an in-app link would (the + button opens the drawer instead). */
async function openFromFab(page: Page) {
	await page.evaluate(() => {
		const a = document.createElement('a');
		a.href = '/movements/new';
		a.textContent = 'Nuevo movimiento (test)';
		document.querySelector('main')!.prepend(a);
	});
	await page.getByRole('link', { name: 'Nuevo movimiento (test)' }).click();
}

test('from Plan, saving returns to Plan with a toast; back skips the form', async ({ page }) => {
	await page.goto('/plan');
	await page.waitForLoadState('networkidle'); // hydration guard: the injected in-app link needs JS
	await openFromFab(page);
	await fillAndSave(page, unique('Origen plan'));

	await expect(page).toHaveURL(/\/plan$/);
	await expect(toast(page)).toBeVisible();
	await expect(toast(page).getByRole('button', { name: 'Deshacer' })).toBeVisible();
	await expect(toast(page).getByRole('button')).toHaveCount(1);

	// The form was popped, not pushed: back goes to the screen before Plan (Inicio, after login).
	await page.goBack();
	await expect.poll(() => pathname(page)).toBe('/');
});

test('a new transfer returns to its origin', async ({ page }) => {
	await page.goto('/plan');
	await page.waitForLoadState('networkidle'); // hydration guard: the injected in-app link needs JS
	await openFromFab(page);
	await expect(page).toHaveURL(/\/movements\/new$/);
	await settled(page);
	await page.getByRole('radio', { name: 'Transf.' }).check({ force: true });
	await page.locator('input[name="amount"]').fill('1000');
	await page.locator('input[name="description"]').fill(unique('Origen transferencia'));
	await pick(page, 'Desde', 'Otra cuenta pesos');
	await pick(page, 'Hacia', 'Otra cuenta');
	await fillRate(page, '1000');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/plan$/);
	await expect(toast(page)).toBeVisible();
});

test('a validation error keeps the origin: fixing it and saving returns there', async ({
	page
}) => {
	await page.goto('/plan');
	await page.waitForLoadState('networkidle'); // hydration guard: the injected in-app link needs JS
	await openFromFab(page);
	await expect(page).toHaveURL(/\/movements\/new$/);
	await settled(page);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByText(/Ingresá un monto/)).toBeVisible();
	await expect(page).toHaveURL(/\/movements\/new$/);
	await fillAndSave(page, unique('Origen tras error'));
	await expect(page).toHaveURL(/\/plan$/);
	await expect(toast(page)).toBeVisible();
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	// No-JS form: the pickers render as plain radio groups.
	const option = (page: Page, group: 'Cuenta' | 'Categoría', name: RegExp) =>
		page.getByRole('group', { name: group, exact: true }).getByRole('radio', { name });

	async function saveNoJs(page: Page, description: string) {
		await page.locator('input[name="amount"]').fill('1');
		await page.locator('input[name="description"]').fill(description);
		await option(page, 'Cuenta', /Otra cuenta pesos/).check({ force: true });
		await option(page, 'Categoría', /Ajena/).check({ force: true });
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	}

	test('saving from an account detail lands back on it', async ({ page }) => {
		await page.goto('/accounts');
		const account = await page
			.locator('main a[href*="accounts/"]:not([href$="/new"])')
			.first()
			.evaluate((a: HTMLAnchorElement) => a.pathname);
		await page.goto('/movements/new', { referer: new URL(account, page.url()).href });
		await saveNoJs(page, unique('Origen cuenta'));
		await expect.poll(() => pathname(page)).toBe(account);
		await expect(page.getByRole('status')).toContainText('Movimiento guardado.');
	});

	test('an external or crafted returnTo falls back to the form', async ({ page, baseURL }) => {
		await page.goto('/movements/new');
		const accountId = await option(page, 'Cuenta', /Otra cuenta pesos/).getAttribute('value');
		const categoryId = await option(page, 'Categoría', /Ajena/).getAttribute('value');
		for (const returnTo of [
			'https://evil.example/plan',
			'//evil.example/plan',
			'/\\evil.example/plan',
			'/.//evil.example/plan',
			'/a/..//evil.example/plan',
			'plan',
			'/movements/new',
			'/movements/new/',
			'/movements/%6Eew'
		]) {
			const res = await page.request.post('/movements/new', {
				form: {
					type: 'outcome',
					amount: '1',
					description: unique('Origen ajeno'),
					accountId: accountId!,
					categoryId: categoryId!,
					occurredAt: todayInAppTz(),
					returnTo
				},
				headers: { origin: baseURL!, accept: 'text/html' },
				maxRedirects: 0
			});
			expect(res.status(), returnTo).toBe(303);
			expect(res.headers().location, returnTo).toMatch(/^\/movements\/new\?saved=[0-9a-f-]{36}$/);
		}
	});
});
