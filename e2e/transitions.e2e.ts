// Page transitions: one view transition per navigation, slide direction by push/pop, crossfade for tabs,
// none within one screen, with reduced motion or without browser support. (The iOS swipe-back case, where
// the browser already animated the pop, needs a real iPhone: Chromium never sets hasUAVisualTransition.)
import { expect, test, type Page } from '@playwright/test';
import { login, PHONE } from './helpers';

test.use({ viewport: PHONE });

declare global {
	interface Window {
		__transitions: (string | undefined)[];
	}
}

/** Records the direction on <html> at every `document.startViewTransition` call, then runs the real one. */
async function instrument(page: Page) {
	await page.addInitScript(() => {
		window.__transitions = [];
		const start = document.startViewTransition?.bind(document);
		if (!start) return;
		document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
			window.__transitions.push(document.documentElement.dataset.navTransition);
			return start(arg);
		}) as typeof start;
	});
}

const reset = (page: Page) => page.evaluate(() => (window.__transitions = []));

/** Waits for the expected calls, then makes sure no extra one follows once the page settles. */
async function expectTransitions(page: Page, expected: string[]) {
	await expect.poll(() => page.evaluate(() => window.__transitions)).toEqual(expected);
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(400);
	expect(await page.evaluate(() => window.__transitions)).toEqual(expected);
}

const back = (page: Page, label: string) =>
	page.locator('header.top-bar').getByRole('link', { name: label }).click();

test('a link slides forward, ‹ and browser back slide back, once each', async ({ page }) => {
	await instrument(page);
	await login(page);
	await page.goto('/profile', { waitUntil: 'networkidle' });

	await reset(page);
	await page.getByRole('link', { name: 'Cuentas' }).click();
	await expect(page).toHaveURL(/\/accounts$/);
	await expectTransitions(page, ['forward']);

	await reset(page);
	await back(page, 'Volver al perfil');
	await expect(page).toHaveURL(/\/profile$/);
	await expectTransitions(page, ['back']);

	await reset(page);
	await page.goForward();
	await expect(page).toHaveURL(/\/accounts$/);
	await expectTransitions(page, ['forward']);

	await reset(page);
	await page.goBack();
	await expect(page).toHaveURL(/\/profile$/);
	await expectTransitions(page, ['back']);
});

test('switching tabs crossfades instead of sliding', async ({ page }) => {
	await instrument(page);
	await login(page);
	await page.waitForLoadState('networkidle');

	await reset(page);
	await page
		.getByRole('navigation', { name: 'Navegación principal' })
		.getByRole('link', { name: 'Movimientos' })
		.click();
	await expect(page).toHaveURL(/\/movements$/);
	await expectTransitions(page, ['fade']);
});

test('month and currency changes on one screen have no transition', async ({ page }) => {
	await instrument(page);
	await login(page);
	await page.goto('/reports', { waitUntil: 'networkidle' });

	await reset(page);
	await page.getByRole('link', { name: 'Mes anterior' }).click();
	await expect(page).toHaveURL(/month=/);
	await page.getByRole('radio', { name: 'USD' }).check({ force: true });
	await expect(page.getByRole('radio', { name: 'USD' })).toBeChecked();
	await expectTransitions(page, []);
});

test('reduced motion never starts a transition', async ({ page }) => {
	await instrument(page);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await login(page);
	await page.goto('/profile', { waitUntil: 'networkidle' });

	await reset(page);
	await page.getByRole('link', { name: 'Cuentas' }).click();
	await expect(page).toHaveURL(/\/accounts$/);
	await back(page, 'Volver al perfil');
	await expect(page).toHaveURL(/\/profile$/);
	await expectTransitions(page, []);
});

test('without View Transitions support navigation still works', async ({ page }) => {
	const errors: Error[] = [];
	page.on('pageerror', (e) => errors.push(e));
	await page.addInitScript(() => {
		// @ts-expect-error -- simulating a browser without the API
		delete Document.prototype.startViewTransition;
	});
	await login(page);
	await page.goto('/profile', { waitUntil: 'networkidle' });
	expect(await page.evaluate(() => 'startViewTransition' in document)).toBe(false);

	await page.getByRole('link', { name: 'Cuentas' }).click();
	await expect(page).toHaveURL(/\/accounts$/);
	await back(page, 'Volver al perfil');
	await expect(page).toHaveURL(/\/profile$/);
	expect(errors).toEqual([]);
});
