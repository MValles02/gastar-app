import { expect, test, type Page } from '@playwright/test';
import { firstDetailHref, login, MIN_TARGET_PX, pathOf } from './helpers';

const tabs = [
	{ route: '/', label: 'Inicio' },
	{ route: '/movements', label: 'Movimientos' },
	{ route: '/plan', label: 'Plan' },
	{ route: '/reports', label: 'Reportes' }
];

const nav = (page: Page) => page.getByRole('navigation', { name: 'Navegación principal' });

test.use({ viewport: { width: 393, height: 852 } });

test.beforeEach(async ({ page }) => {
	await login(page);
});

test('tab routes mark the active tab, show icons only and keep 44px targets', async ({ page }) => {
	for (const { route, label } of tabs) {
		await page.goto(route);
		const links = nav(page).locator('.tab');
		await expect(links).toHaveCount(4);
		await expect(nav(page).locator('.tab[aria-current="page"]'), route).toHaveAccessibleName(label);
		await expect(nav(page).locator('[aria-current="page"]')).toHaveCount(1);

		for (const tab of await links.all()) {
			await expect(tab, route).toHaveText('');
			const box = await tab.boundingBox();
			expect(box!.height, route).toBeGreaterThanOrEqual(MIN_TARGET_PX);
			expect(box!.width, route).toBeGreaterThanOrEqual(MIN_TARGET_PX);
		}

		const fab = nav(page).getByRole('link', { name: 'Nuevo movimiento' });
		const fabBox = await fab.boundingBox();
		expect(fabBox!.width).toBe(64);
		expect(fabBox!.height).toBe(64);
		expect(await pathOf(fab)).toBe('/movements/new');
	}
});

test('form routes do not render the tab bar', async ({ page }) => {
	const movement = await firstDetailHref(page, 'movements');
	const account = await firstDetailHref(page, 'accounts');
	const category = await firstDetailHref(page, 'categories');
	expect(movement && account && category).toBeTruthy();
	const routes = [
		'/movements/new',
		`${movement}/edit`,
		'/accounts/new',
		`${account}/edit`,
		'/categories/new',
		`${category}/edit`,
		'/plan/recurring/new',
		'/plan/setup'
	];
	for (const route of routes) {
		await page.goto(route);
		await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible();
		await expect(nav(page), route).toHaveCount(0);
	}
});

test('the tab bar drops its blur when transparency is reduced', async ({ page }) => {
	await page.goto('/');
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Emulation.setEmulatedMedia', {
		features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }]
	});
	await expect(page.locator('.tabs')).toHaveCSS('backdrop-filter', 'none');
});

test('the toast live region is mounted before any toast', async ({ page }) => {
	await page.goto('/');
	await expect(
		page.locator('section[aria-live="polite"][aria-label^="Notificaciones"]')
	).toBeAttached();
});
