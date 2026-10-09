import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	fillMovement,
	login,
	MOVEMENT_DETAIL_RE,
	pick,
	postDelete,
	WHOLE_PESOS_ERROR
} from './helpers';

// Descriptions of movements and URLs of accounts this spec may have created; removed in afterEach.
const created: string[] = [];
const createdAccounts: string[] = [];
const unique = (prefix: string) => {
	const d = `${prefix} ${Date.now()}`;
	created.push(d);
	return d;
};

test.beforeEach(async ({ page }) => {
	await login(page);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
	for (const href of createdAccounts.splice(0)) await postDelete(page, baseURL!, href);
});

const norm = (s: string | null) => (s ?? '').replace(/[\u00A0\u200B]/g, ' ').trim();

const save = (page: Page) => page.getByRole('button', { name: 'Guardar movimiento' }).click();
const openDetail = async (page: Page, desc: string, currency: 'ARS' | 'USD' = 'ARS') => {
	await page.goto(`/movements?q=${encodeURIComponent(desc)}&currency=${currency}`);
	await page.getByText(desc).click();
	await expect(page).toHaveURL(MOVEMENT_DETAIL_RE);
};
const detailValue = (page: Page, term: string) =>
	page.locator('dt', { hasText: term }).locator('+ dd');

test('an ARS amount with decimals is rejected and the value kept', async ({ page }) => {
	await fillMovement(page, {
		type: 'Gasto',
		amount: '1.500,50',
		description: unique('ARS decimales'),
		account: 'Banco Galicia',
		category: 'Supermercado'
	});
	await save(page);
	await expect(page.getByText(WHOLE_PESOS_ERROR)).toBeVisible();
	await expect(page.locator('input[name="amount"]')).toHaveValue('1.500,50');
	await expect(page).toHaveURL(/\/movements\/new$/);
});

test('USD keeps its cents', async ({ page }) => {
	const desc = unique('USD centavos');
	await fillMovement(page, {
		type: 'Ingreso',
		amount: '12,34',
		description: desc,
		account: 'Ahorro USD',
		category: 'Freelance'
	});
	await save(page);
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();
	await openDetail(page, desc, 'USD');
	await expect(page.locator('main')).toContainText(/US\$\s12,34/);
});

test('an ARS whole amount shows without decimals everywhere', async ({ page }) => {
	const desc = unique('ARS entero');
	await fillMovement(page, {
		type: 'Gasto',
		amount: '1500',
		description: desc,
		account: 'Banco Galicia',
		category: 'Supermercado'
	});
	await save(page);
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();

	await page.goto(`/movements?q=${encodeURIComponent(desc)}`);
	const row = page.locator('a', { hasText: desc }).locator('.row-amount');
	expect(norm(await row.textContent())).toMatch(/^-\$\s1\.500$/);

	await row.click();
	await expect(page).toHaveURL(MOVEMENT_DETAIL_RE);
	await expect(page.locator('main')).toContainText(/-\$\s1\.500/);
	expect(norm(await page.locator('main').textContent())).toMatch(/-\$ 1\.500/);

	await page.goto('/', { waitUntil: 'networkidle' });
	expect(norm(await page.locator('.hero-amount').textContent())).toMatch(/^\$\s[\d.]+$/);

	await page.goto('/accounts', { waitUntil: 'networkidle' });
	const acct = page.locator('li', { hasText: 'Banco Galicia' }).locator('.row-amount');
	expect(norm(await acct.textContent())).toMatch(/^\$\s[\d.]+$/);
});

test('a USD to ARS transfer converts to whole pesos and rejects a non-whole rate', async ({
	page
}) => {
	const desc = unique('Transferencia entera');
	await fillMovement(page, {
		type: 'Transferencia',
		amount: '10,01',
		description: desc,
		account: 'Ahorro USD',
		destination: 'Banco Galicia',
		rate: '1234,5'
	});
	await save(page);
	await expect(page.getByText(/en pesos enteros y mayor a cero/)).toBeVisible();
	await expect(page).toHaveURL(/\/movements\/new$/);

	await page.locator('input[name="exchangeRate"]').fill('1234');
	await expect(page.getByText('Monto en destino: $ 12.352')).toBeVisible();
	await save(page);
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();
	await openDetail(page, desc, 'USD');
	expect(norm(await detailValue(page, 'En destino').textContent())).toBe('$ 12.352');
});

test('account initial balance: ARS whole only, USD keeps cents, edit prefills the stored value', async ({
	page
}) => {
	const create = async (name: string, currency: 'ARS' | 'USD', balance: string) => {
		await page.goto('/accounts/new', { waitUntil: 'networkidle' });
		await page.getByLabel('Nombre').fill(name);
		await page.getByRole('radio', { name: currency }).check({ force: true });
		await page.getByLabel('Saldo inicial').fill(balance);
		await page.getByRole('button', { name: 'Crear cuenta' }).click();
	};

	await create(`ARS cuenta ${Date.now()}`, 'ARS', '100,50');
	await expect(page.getByText(WHOLE_PESOS_ERROR)).toBeVisible();
	await expect(page.getByLabel('Saldo inicial')).toHaveValue('100,50');
	await expect(page).toHaveURL(/\/accounts\/new$/);

	await create(`USD cuenta ${Date.now()}`, 'USD', '100,50');
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	createdAccounts.push(page.url());

	await page.goto('/accounts', { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: /Banco Galicia/ }).click();
	await page.getByRole('link', { name: 'Editar' }).click();
	// scripts/seed.js: Banco Galicia starts at 650_000_00 cents.
	await expect(page.getByLabel('Saldo inicial')).toHaveValue('650000');
});

test('the transfer preview rounds half up into ARS and keeps cents into USD', async ({ page }) => {
	await fillMovement(page, {
		type: 'Transferencia',
		amount: '0,01',
		description: 'Vista previa',
		account: 'Ahorro USD',
		destination: 'Banco Galicia',
		rate: '50'
	});
	await expect(page.getByText('Monto en destino: $ 1', { exact: true })).toBeVisible();

	await fillMovement(page, {
		type: 'Transferencia',
		amount: '12352',
		description: 'Vista previa',
		account: 'Banco Galicia',
		destination: 'Ahorro USD',
		rate: '1234'
	});
	await expect(page.getByText('Monto en destino: US$ 10,01', { exact: true })).toBeVisible();
});

test('movement form inputs follow the origin currency', async ({ page }) => {
	await fillMovement(page, {
		type: 'Transferencia',
		amount: '',
		description: 'Atributos',
		account: 'Banco Galicia',
		destination: 'Ahorro USD'
	});
	const amount = page.locator('input[name="amount"]');
	const rate = page.locator('input[name="exchangeRate"]');
	await expect(amount).toHaveAttribute('inputmode', 'numeric');
	await expect(amount).toHaveAttribute('placeholder', '0');
	await expect(rate).toHaveAttribute('inputmode', 'numeric');
	await expect(rate).toHaveAttribute('placeholder', '0');

	await pick(page, 'Cuenta de origen', 'Ahorro USD');
	await pick(page, 'Cuenta de destino', 'Banco Galicia');
	await expect(amount).toHaveAttribute('inputmode', 'decimal');
	await expect(amount).toHaveAttribute('placeholder', '0,00');
	await expect(rate).toHaveAttribute('inputmode', 'numeric');
	await expect(rate).toHaveAttribute('placeholder', '0');
});

test('account form initial balance placeholder follows the currency', async ({ page }) => {
	await page.goto('/accounts/new', { waitUntil: 'networkidle' });
	const balance = page.getByLabel('Saldo inicial');
	await page.getByRole('radio', { name: 'ARS' }).check({ force: true });
	await expect(balance).toHaveAttribute('placeholder', '0');
	await page.getByRole('radio', { name: 'USD' }).check({ force: true });
	await expect(balance).toHaveAttribute('placeholder', '0,00');
});
