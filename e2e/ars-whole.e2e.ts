import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	fillMovement,
	login,
	OTHER_EMAIL,
	postDelete,
	WHOLE_PESOS_ERROR
} from './helpers';

// Runs as otro: the demo user's current month must stay untouched (Reportes/Inicio compare its totals), and
// every write is dated in the past so other specs' otro totals are not disturbed either.
// Descriptions of movements and URLs of accounts this spec may have created; removed in afterEach.
const created: string[] = [];
const createdAccounts: string[] = [];
const unique = (prefix: string) => {
	const d = `${prefix} ${Date.now()}`;
	created.push(d);
	return d;
};

test.beforeEach(async ({ page }) => {
	await login(page, OTHER_EMAIL);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
	for (const href of createdAccounts.splice(0)) await postDelete(page, baseURL!, href);
});

const norm = (s: string | null) => (s ?? '').replace(/[\u00A0\u200B]/g, ' ').trim();

const save = (page: Page) => page.getByRole('button', { name: 'Guardar', exact: true }).click();
// A row opens the movement drawer over the list (the URL does not change).
const openDetail = async (page: Page, desc: string, currency: 'ARS' | 'USD' = 'ARS') => {
	await page.goto(`/movements?q=${encodeURIComponent(desc)}&currency=${currency}`);
	await page.getByText(desc).click();
	const drawer = page.getByRole('dialog');
	await expect(drawer).toBeVisible();
	return drawer;
};

test('an ARS amount with decimals is rejected and the value kept', async ({ page }) => {
	await fillMovement(page, {
		type: 'Gasto',
		amount: '1.500,50',
		description: unique('ARS decimales'),
		account: 'Otra cuenta pesos',
		category: 'Ajena'
	});
	await save(page);
	await expect(page.getByText(WHOLE_PESOS_ERROR)).toBeVisible();
	await expect(page.locator('input[name="amount"]')).toHaveValue(/^1\.?500,50$/);
	await expect(page).toHaveURL(/\/movements\/new$/);
});

test('USD keeps its cents', async ({ page }) => {
	const desc = unique('USD centavos');
	await fillMovement(page, {
		type: 'Ingreso',
		amount: '12,34',
		date: '2024-02-29',
		description: desc,
		account: 'Otra cuenta',
		category: 'Ajena'
	});
	await save(page);
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();
	const drawer = await openDetail(page, desc, 'USD');
	await expect(drawer.getByRole('button', { name: 'Monto: 12,34' })).toContainText(/US\$12,34/);
});

test('an ARS whole amount shows without decimals everywhere', async ({ page }) => {
	const desc = unique('ARS entero');
	await fillMovement(page, {
		type: 'Gasto',
		amount: '1500',
		date: '2024-02-29',
		description: desc,
		account: 'Otra cuenta pesos',
		category: 'Ajena'
	});
	await save(page);
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();

	await page.goto(`/movements?q=${encodeURIComponent(desc)}`);
	const row = page.locator('a', { hasText: desc }).locator('.row-amount');
	expect(norm(await row.textContent())).toMatch(/^-\$1\.500$/);

	await row.click();
	const drawer = page.getByRole('dialog');
	await expect(drawer.getByRole('button', { name: 'Monto: 1.500' })).toHaveText(/^\s*\$1\.500\s*$/);

	await page.goto('/');
	// Optional minus: other workers' transient `otro` outcomes can push the total below zero.
	expect(norm(await page.locator('.hero-amount').textContent())).toMatch(/^-?\$[\d.]+$/);

	await page.goto('/accounts');
	const acct = page
		.locator('[role="listitem"]', { hasText: 'Otra cuenta pesos' })
		.locator('.row-amount');
	expect(norm(await acct.textContent())).toMatch(/^\$[\d.]+$/);
});

test('a USD to ARS transfer converts to whole pesos and rejects a non-whole rate', async ({
	page
}) => {
	const desc = unique('Transferencia entera');
	await fillMovement(page, {
		type: 'Transferencia',
		amount: '10,01',
		date: '2024-02-29',
		description: desc,
		account: 'Otra cuenta',
		destination: 'Otra cuenta pesos',
		rate: '1234,5'
	});
	await save(page);
	await expect(page.getByText(/en pesos enteros y mayor a cero/)).toBeVisible();
	await expect(page).toHaveURL(/\/movements\/new$/);

	await page.locator('input[name="exchangeRate"]').fill('1234');
	await expect(page.locator('p', { hasText: 'En destino' })).toContainText('$12.352');
	await save(page);
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();
	const drawer = await openDetail(page, desc, 'USD');
	await expect(drawer.locator('p', { hasText: 'En destino' })).toContainText('$12.352');
	// The preview rounds half up into ARS and keeps cents into USD.
	await fillMovement(page, {
		type: 'Transferencia',
		amount: '0,01',
		description: 'Vista previa',
		account: 'Otra cuenta',
		destination: 'Otra cuenta pesos',
		rate: '50'
	});
	await expect(page.locator('p', { hasText: 'En destino' })).toContainText('$1');
	await fillMovement(page, {
		type: 'Transferencia',
		amount: '12352',
		description: 'Vista previa',
		account: 'Otra cuenta pesos',
		destination: 'Otra cuenta',
		rate: '1234'
	});
	await expect(page.locator('p', { hasText: 'En destino' })).toContainText('US$10,01');
});

test('account initial balance: ARS whole only, USD keeps cents, edit prefills the stored value', async ({
	page
}) => {
	const create = async (name: string, currency: 'ARS' | 'USD', balance: string) => {
		await page.goto('/accounts/new');
		await page.getByLabel('Nombre').fill(name);
		await page.getByRole('radio', { name: currency }).check({ force: true });
		await page.getByLabel('Saldo inicial').fill(balance);
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	};

	await create(`ARS cuenta ${Date.now()}`, 'ARS', '100,50');
	await expect(page.getByText(WHOLE_PESOS_ERROR)).toBeVisible();
	await expect(page.getByLabel('Saldo inicial')).toHaveValue('100,50');
	await expect(page).toHaveURL(/\/accounts\/new$/);

	await create(`USD cuenta ${Date.now()}`, 'USD', '100,50');
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	createdAccounts.push(page.url());

	await page.goto('/accounts');
	await page.getByRole('link', { name: /Otra cuenta pesos/ }).click();
	await page.getByRole('link', { name: 'Editar' }).click();
	// scripts/seed.js: Otra cuenta pesos starts at 500_000_00 cents.
	await expect(page.getByLabel('Saldo inicial')).toHaveValue('500.000');
	// The grouped prefill saves unchanged.
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
});
