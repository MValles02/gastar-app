// "Nuevo movimiento" as a drawer: opened from the + button over the current screen (shallow route: the URL
// does not change), stacked picker drawers, per-row validation, and a "Movimiento guardado." toast whose
// only action, "Deshacer", deletes the movement. Uses the seeded `otro` user (see playwright.config.ts).
import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	findMovements,
	login,
	OTHER_EMAIL,
	fillRate,
	pick,
	PHONE,
	postDelete
} from './helpers';

test.use({ viewport: PHONE });

const created: string[] = [];
const unique = (prefix: string) => {
	const d = `${prefix} ${Date.now()}`;
	created.push(d);
	return d;
};
const categories: string[] = [];

test.beforeEach(async ({ page }) => {
	await login(page, OTHER_EMAIL);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
	for (const name of categories.splice(0)) {
		await page.goto('/categories');
		const hrefs = await page
			.locator('main a[href*="categories/"]', { hasText: name })
			.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
		for (const href of hrefs) await postDelete(page, baseURL!, href);
	}
});

const toast = (page: Page) =>
	page.locator('[data-sonner-toast]', { hasText: 'Movimiento guardado.' }).first();
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Nuevo movimiento' });

async function open(page: Page, from = '/plan') {
	await page.goto(from);
	await page.waitForLoadState('networkidle'); // hydration guard: the new-movement drawer needs JS
	await page
		.getByRole('navigation', { name: 'Navegación principal' })
		.getByRole('link', { name: 'Nuevo movimiento' })
		.click();
	await expect(drawer(page)).toBeVisible();
}

const save = (page: Page) => drawer(page).getByRole('button', { name: 'Guardar', exact: true });

async function fill(page: Page, description: string) {
	await page.locator('input[name="amount"]').fill('1');
	await page.locator('input[name="description"]').fill(description);
}

test('Cuenta comes preselected and the movement is saved to that account', async ({ page }) => {
	const description = unique('Preseleccion');
	await open(page);
	const account = drawer(page).getByRole('button', { name: /^Cuenta/ });
	await expect(account).not.toContainText('Elegir');
	const name = (await account.innerText()).replace(/^Cuentas*/, '').trim();
	await fill(page, description);
	await pick(page, 'Categoría', 'Ajena');
	await save(page).click();
	await expect(toast(page)).toBeVisible();
	const [href] = await findMovements(page, description);
	await page.goto(href);
	await expect(page.getByRole('button', { name: `Cuenta ${name}` })).toBeVisible();
});

test('Deshacer removes the created movement and the row is highlighted', async ({ page }) => {
	const description = unique('Deshacer');
	await open(page, '/movements');
	await fill(page, description);
	await pick(page, 'Cuenta', 'Otra cuenta pesos');
	await pick(page, 'Categoría', 'Ajena');
	await save(page).click();
	await expect(drawer(page)).toBeHidden();
	await expect(page).toHaveURL(/\/movements$/);
	await expect(page.getByText(description)).toBeVisible();
	await expect(page.locator('[data-highlighted="true"]')).toHaveCount(1);
	await expect(toast(page)).toBeVisible();
	await expect(
		page.locator('[data-sonner-toast]', { hasText: 'Movimiento guardado.' })
	).toHaveCount(1);
	await expect(toast(page).getByRole('button')).toHaveCount(1);
	await toast(page).getByRole('button', { name: 'Deshacer' }).click();
	await expect(page.getByText(description)).toHaveCount(0);
	expect(await findMovements(page, description)).toHaveLength(0);
});

test('a cross-currency transfer shows Cotización and En destino', async ({ page }) => {
	await open(page);
	await drawer(page).getByText('Transf.', { exact: true }).click();
	await expect(drawer(page).getByRole('button', { name: /^Categoría/ })).toHaveCount(0);
	await fill(page, unique('Transferencia drawer'));
	await page.locator('input[name="amount"]').fill('1000');
	await pick(page, 'Desde', 'Otra cuenta pesos');
	await pick(page, 'Hacia', 'Otra cuenta');
	await expect(drawer(page).getByRole('button', { name: /^Cotización/ })).toBeVisible();
	const dest = drawer(page).locator('p', { hasText: 'En destino' });
	await expect(dest).toContainText('—');
	await fillRate(page, '1000');
	await expect(dest).toContainText('US$1');
	await expect(drawer(page).getByRole('button', { name: /^Cotización/ })).toContainText(
		'1 USD = $1.000'
	);
});
