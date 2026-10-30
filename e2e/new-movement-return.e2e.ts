// Saving a new movement returns to the screen the form was opened from, popping the form (history does
// not grow), with a "Movimiento guardado." toast whose "Agregar otro" reopens the form from there.
// Without JS the action redirects to the same origin (from the Referer); anything else falls back to
// the form itself.
import { expect, test, type Page } from '@playwright/test';
import { deleteMovements, login, OTHER_EMAIL, pick, PHONE, todayInAppTz } from './helpers';

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
const toast = (page: Page) =>
	page.locator('[data-sonner-toast]', { hasText: 'Movimiento guardado.' });

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
	await page.waitForLoadState('networkidle');
	await settled(page);
	await page.locator('input[name="amount"]').fill('1');
	await page.locator('input[name="description"]').fill(description);
	await pick(page, 'Cuenta', 'Otra cuenta pesos');
	await pick(page, 'Categoría', 'Ajena');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
}

const openFromFab = (page: Page) =>
	page
		.getByRole('navigation', { name: 'Navegación principal' })
		.getByRole('link', { name: 'Nuevo movimiento' })
		.click();

test('from Plan, saving returns to Plan with a toast; Agregar otro saves back there; back skips the form', async ({
	page
}) => {
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await openFromFab(page);
	await fillAndSave(page, unique('Origen plan'));

	await expect(page).toHaveURL(/\/plan$/);
	await expect(toast(page)).toBeVisible();

	await toast(page).getByRole('button', { name: 'Agregar otro' }).click();
	await fillAndSave(page, unique('Origen plan otro'));
	await expect(page).toHaveURL(/\/plan$/);
	await expect(toast(page)).toBeVisible();

	// The forms were popped, not pushed: back goes to the screen before Plan (Inicio, after login).
	await page.goBack();
	await expect.poll(() => pathname(page)).toBe('/');
});

for (const origin of ['/', '/movements']) {
	test(`from ${origin}, saving returns there with the toast`, async ({ page }) => {
		await page.goto(origin, { waitUntil: 'networkidle' });
		await openFromFab(page);
		await fillAndSave(page, unique('Origen tab'));
		await expect.poll(() => pathname(page)).toBe(origin);
		await expect(toast(page)).toBeVisible();
		await expect(page).not.toHaveURL(/movementSaved/);
	});
}

test('a new transfer returns to its origin', async ({ page }) => {
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await openFromFab(page);
	await expect(page).toHaveURL(/\/movements\/new$/);
	await page.waitForLoadState('networkidle');
	await settled(page);
	await page.getByRole('radio', { name: 'Transf.' }).check({ force: true });
	await page.locator('input[name="amount"]').fill('1000');
	await page.locator('input[name="description"]').fill(unique('Origen transferencia'));
	await pick(page, 'Origen', 'Otra cuenta pesos');
	await pick(page, 'Destino', 'Otra cuenta');
	await page.locator('input[name="exchangeRate"]').fill('1000');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/plan$/);
	await expect(toast(page)).toBeVisible();
});

test('a validation error keeps the origin: fixing it and saving returns there', async ({
	page
}) => {
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await openFromFab(page);
	await expect(page).toHaveURL(/\/movements\/new$/);
	await page.waitForLoadState('networkidle');
	await settled(page);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByText(/Ingresá un monto/)).toBeVisible();
	await expect(page).toHaveURL(/\/movements\/new$/);
	await fillAndSave(page, unique('Origen tras error'));
	await expect(page).toHaveURL(/\/plan$/);
	await expect(toast(page)).toBeVisible();
});

test('from an account detail, saving pops back to it', async ({ page }) => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await page
		.getByRole('link', { name: /Otra cuenta pesos/ })
		.first()
		.click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	const account = pathname(page);
	await page.waitForLoadState('networkidle');
	// The detail has no + yet: an in-app link stands in for one (the router handles it like any link).
	await page.evaluate(() => {
		const a = document.createElement('a');
		a.href = '/movements/new';
		a.textContent = 'Nuevo movimiento (test)';
		document.querySelector('main')!.prepend(a);
	});
	await page.getByRole('link', { name: 'Nuevo movimiento (test)' }).click();
	await fillAndSave(page, unique('Origen cuenta JS'));
	await expect.poll(() => pathname(page)).toBe(account);
	await expect(toast(page)).toBeVisible();
	// Popped, not pushed: back lands on the accounts list, not the form.
	await page.goBack();
	await expect.poll(() => pathname(page)).toBe('/accounts');
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('a validation error keeps the origin', async ({ page }) => {
		await page.goto('/plan');
		await page.getByRole('link', { name: 'Nuevo movimiento' }).click();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText(/Ingresá un monto/)).toBeVisible();
		await saveNoJs(page, unique('Origen sin JS error'));
		await expect(page).toHaveURL(/\/plan\?movementSaved=1$/);
	});

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

	test('saving from Plan lands on Plan with the status and Agregar otro', async ({ page }) => {
		await page.goto('/plan');
		await page.getByRole('link', { name: 'Nuevo movimiento' }).click();
		await expect(page).toHaveURL(/\/movements\/new$/);
		await saveNoJs(page, unique('Origen sin JS'));
		await expect(page).toHaveURL(/\/plan\?movementSaved=1$/);
		await expect(page.getByRole('status')).toContainText('Movimiento guardado.');
		await expect(page.getByRole('link', { name: 'Agregar otro' })).toHaveAttribute(
			'href',
			/\/movements\/new$/
		);
	});

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
			expect(res.headers().location, returnTo).toBe('/movements/new?saved=1');
		}
	});
});
