import { expect, test, type Page } from '@playwright/test';
import { deleteRules, login, OTHER_EMAIL, pick, pickDay, postDelete } from './helpers';

// Created accounts (detail URLs) are removed in afterEach. Runs as otro so the demo user's totals stay untouched.
const createdAccounts: string[] = [];

test.beforeEach(async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 667 });
});

test.afterEach(async ({ page, baseURL }) => {
	for (const href of createdAccounts.splice(0)) await postDelete(page, baseURL!, href);
});

test('the account form picks icon and color in drawers and persists them', async ({ page }) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts/new', { waitUntil: 'networkidle' });
	await page.getByLabel('Nombre').fill(`Forms ${Date.now()}`);

	// Cancelar and Crear cuenta side by side, equal width (50/50), visible without scrolling.
	const cancel = (await page.getByRole('link', { name: 'Cancelar' }).boundingBox())!;
	const submit = (await page.getByRole('button', { name: 'Crear cuenta' }).boundingBox())!;
	expect(Math.abs(cancel.y - submit.y)).toBeLessThan(2);
	expect(cancel.x + cancel.width).toBeLessThan(submit.x);
	expect(Math.abs(submit.width - cancel.width)).toBeLessThan(2);
	expect(submit.y + submit.height).toBeLessThanOrEqual(667);

	await page.getByRole('button', { name: /^Ícono/ }).click();
	const banco = page.getByRole('dialog').getByRole('radio', { name: 'Banco' });
	await expect(banco).toBeInViewport();
	await banco.click();
	await expect(page.getByRole('dialog')).toBeHidden();
	await page.getByRole('button', { name: /^Color/ }).click();
	const naranja = page.getByRole('dialog').getByRole('radio', { name: 'Naranja' });
	await expect(naranja).toBeInViewport();
	await naranja.click();
	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(page.getByRole('button', { name: /^Color/ })).toContainText('Naranja');

	await page.getByRole('button', { name: 'Crear cuenta' }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	createdAccounts.push(page.url());
	await expect(page.getByText('Banco · Naranja')).toBeVisible();
});

test('a currency-locked account shows a read-only Moneda row', async ({ page }) => {
	await login(page);
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await page
		.getByRole('link', { name: /Efectivo/ })
		.first()
		.click();
	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(
		page.getByText('No se puede cambiar porque la cuenta tiene movimientos.')
	).toBeVisible();
	await expect(page.getByRole('radio', { name: 'USD' })).toHaveCount(0);
	await expect(page.locator('input[name="currency"]')).toHaveCount(0);
});

const actionsVisible = async (page: Page, submitName: RegExp) => {
	const cancel = (await page.getByRole('link', { name: 'Cancelar' }).boundingBox())!;
	const submit = (await page.getByRole('button', { name: submitName }).boundingBox())!;
	expect(Math.abs(cancel.y - submit.y)).toBeLessThan(2);
	expect(cancel.x + cancel.width).toBeLessThan(submit.x);
	expect(submit.y + submit.height).toBeLessThanOrEqual(667);
};

test('the movement form shows Transf. and both actions without scrolling', async ({ page }) => {
	await login(page);
	await page.goto('/movements/new', { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'Transf.' })).toBeAttached();
	await actionsVisible(page, /^Guardar$/);
});

test('the recurring form: toggle order, live title, ?type=income, day drawer', async ({
	page,
	baseURL
}) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/plan/recurring/new', { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio').first()).toHaveAccessibleName('Ingreso');
	await expect(page.getByRole('radio').last()).toHaveAccessibleName('Pago');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nuevo pago fijo');
	await page.getByRole('radio', { name: 'Ingreso' }).check({ force: true });
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nuevo ingreso fijo');
	await actionsVisible(page, /^Guardar$/);

	await page.goto('/plan/recurring/new?type=income', { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'Ingreso' })).toBeChecked();
	await page.goto('/plan/recurring/new', { waitUntil: 'networkidle' });

	const description = `Forms regla ${Date.now()}`;
	await page.locator('input[name="description"]').fill(description);
	await page.locator('input[name="amount"]').fill('1000');
	await pick(page, 'Cuenta', 'Otra cuenta pesos');
	await pick(page, 'Categoría', 'Ajena');
	await pickDay(page, '15');
	await expect(page.getByRole('button', { name: /^Día del mes/ })).toContainText('15');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/plan$/);
	try {
		await expect(page.locator('.rule', { hasText: description })).toContainText('Día 15');
	} finally {
		await deleteRules(page, baseURL!, description);
	}
});

test('the account detail shows "Ícono y color" untruncated on one line', async ({ page }) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts/new', { waitUntil: 'networkidle' });
	await page.getByLabel('Nombre').fill(`Forms ancho ${Date.now()}`);
	await page.getByRole('button', { name: /^Ícono/ }).click();
	const banco = page.getByRole('dialog').getByRole('radio', { name: 'Banco' });
	await expect(banco).toBeInViewport();
	await banco.click();
	await page.getByRole('button', { name: /^Color/ }).click();
	const naranja = page.getByRole('dialog').getByRole('radio', { name: 'Naranja' });
	await expect(naranja).toBeInViewport();
	await naranja.click();
	await page.getByRole('button', { name: 'Crear cuenta' }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	createdAccounts.push(page.url());
	const value = page.getByText('Banco · Naranja');
	await expect(value).toBeVisible();
	const { scrollWidth, clientWidth } = await value.evaluate((el) => ({
		scrollWidth: el.scrollWidth,
		clientWidth: el.clientWidth
	}));
	expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
