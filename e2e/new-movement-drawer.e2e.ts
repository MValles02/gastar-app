// "Nuevo movimiento" as a drawer: opened from the + button over the current screen (shallow route: the URL
// does not change), stacked picker drawers, per-row validation, and a "Movimiento guardado." toast whose
// only action, "Deshacer", deletes the movement. Uses the seeded `otro` user (see playwright.config.ts).
import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	findMovements,
	login,
	OTHER_EMAIL,
	pick,
	PHONE,
	pickMovementDate,
	postDelete,
	todayInAppTz
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
	await page.goto(from, { waitUntil: 'networkidle' });
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

test('opens over the current screen and closes with Cancelar', async ({ page }) => {
	await open(page, '/plan');
	await expect(page).toHaveURL(/\/plan$/);
	await expect(page.locator('main')).toBeVisible();
	await drawer(page).getByRole('button', { name: 'Cancelar' }).click();
	await expect(drawer(page)).toBeHidden();
	await expect(page).toHaveURL(/\/plan$/);
});

test('pickers stack over the drawer and pick and close', async ({ page }) => {
	await open(page);
	await pick(page, 'Cuenta', 'Otra cuenta pesos');
	await expect(drawer(page).getByRole('button', { name: /^Cuenta/ })).toContainText(
		'Otra cuenta pesos'
	);
	await expect(page.getByRole('dialog')).toHaveCount(1);
	await pick(page, 'Categoría', 'Ajena');
	await expect(drawer(page).getByRole('button', { name: /^Categoría/ })).toContainText('Ajena');
	await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('+ Nueva categoría keeps the draft and selects the new category', async ({ page }) => {
	const name = `Cat drawer ${Date.now()}`;
	categories.push(name);
	await open(page);
	await fill(page, unique('Draft cat'));
	await page.getByRole('button', { name: /^Categoría/ }).click();
	await page.getByRole('button', { name: '+ Nueva categoría' }).click();
	const create = page.getByRole('dialog', { name: 'Nueva categoría' });
	await expect(create.getByRole('button', { name: 'Guardar' })).toBeDisabled();
	await create.getByLabel('Nombre').fill(name);
	await create.getByRole('button', { name: 'Guardar' }).click();
	await expect(create).toBeHidden();
	await expect(drawer(page).getByRole('button', { name: /^Categoría/ })).toContainText(name);
	await expect(page.locator('input[name="amount"]')).toHaveValue('1');
	await expect(page.locator('input[name="description"]')).toHaveValue(/^Draft cat/);
});

test('Fecha offers Hoy, Ayer and Otra fecha', async ({ page }) => {
	await open(page);
	const date = page.locator('input[name="occurredAt"]');
	const row = drawer(page).getByRole('button', { name: /^Fecha/ });
	await expect(row).toContainText(/Hoy, \d\d\/\d\d/);

	await row.click();
	await page.getByRole('dialog').last().getByText('Ayer', { exact: true }).click();
	await expect(row).toContainText(/Ayer, \d\d\/\d\d/);
	const [y, m, d] = todayInAppTz().split('-').map(Number);
	const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
	await expect(date).toHaveValue(yesterday);

	await row.click();
	await page.getByRole('dialog').last().getByText('Hoy', { exact: true }).click();
	await expect(date).toHaveValue(todayInAppTz());

	await pickMovementDate(page, '2025-03-10');
	await expect(date).toHaveValue('2025-03-10');
	await expect(row).toContainText('10/03/2025');
});

test('validation: Guardar waits for amount and description; a missing row is marked alone', async ({
	page
}) => {
	await open(page);
	await expect(save(page)).toBeDisabled();
	await fill(page, unique('Validacion'));
	await expect(save(page)).toBeEnabled();
	await pick(page, 'Cuenta', 'Otra cuenta pesos');
	await save(page).click();
	await expect(drawer(page).getByText('Elegí una categoría.')).toBeVisible();
	await expect(drawer(page).getByRole('alert')).toHaveCount(1);
	await expect(page.getByText('Elegí una cuenta.')).toHaveCount(0);
	await pick(page, 'Categoría', 'Ajena');
	await expect(drawer(page).getByText('Elegí una categoría.')).toHaveCount(0);
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

test('Deshacer keeps another movement detail drawer open (#273)', async ({ page }) => {
	const other = unique('Detalle abierto');
	const description = unique('Deshacer con detalle');
	const create = async (text: string) => {
		await fill(page, text);
		await pick(page, 'Cuenta', 'Otra cuenta pesos');
		await pick(page, 'Categoría', 'Ajena');
		await save(page).click();
		await expect(drawer(page)).toBeHidden();
	};
	await open(page, '/movements');
	await create(other);
	await open(page, '/movements');
	await create(description);
	await expect(toast(page)).toBeVisible();
	await page.locator('a', { hasText: other }).click();
	const detail = page.getByRole('dialog');
	await expect(detail).toBeVisible();
	const deleted = page.waitForResponse((r) => r.url().includes('?/delete'));
	const refreshed = page.waitForResponse((r) => r.url().includes('__data.json'));
	await toast(page).getByRole('button', { name: 'Deshacer' }).click();
	await deleted;
	await refreshed;
	// The loads refresh after the delete; a stray invalidateAll would have closed the drawer.
	await expect(detail).toBeVisible();
	expect(await findMovements(page, description)).toHaveLength(0);
});

test('/movements/new still renders the form and saves', async ({ page }) => {
	const description = unique('Deep link');
	await page.goto('/movements/new', { waitUntil: 'networkidle' });
	await expect(page.getByRole('heading', { name: 'Nuevo movimiento' })).toBeVisible();
	await fill(page, description);
	await pick(page, 'Cuenta', 'Otra cuenta pesos');
	await pick(page, 'Categoría', 'Ajena');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(toast(page)).toBeVisible();
	expect(await findMovements(page, description)).toHaveLength(1);
});

test('a cross-currency transfer shows Cotización and En destino', async ({ page }) => {
	await open(page);
	await drawer(page).getByText('Transf.', { exact: true }).click();
	await expect(drawer(page).getByRole('button', { name: /^Categoría/ })).toHaveCount(0);
	await fill(page, unique('Transferencia drawer'));
	await page.locator('input[name="amount"]').fill('1000');
	await pick(page, 'Desde', 'Otra cuenta pesos');
	await pick(page, 'Hacia', 'Otra cuenta');
	await expect(page.locator('input[name="exchangeRate"]')).toBeVisible();
	const dest = drawer(page).locator('p', { hasText: 'En destino' });
	await expect(dest).toContainText('—');
	await page.locator('input[name="exchangeRate"]').fill('1000');
	await expect(dest).toContainText('US$1');
});
