import { expect, test, type Page } from '@playwright/test';
import {
	createAccount,
	deleteMovements,
	fillMovement,
	fillRate,
	gotoHydrated,
	idByName,
	login,
	OTHER_EMAIL,
	postDelete,
	save,
	unique,
	WHOLE_PESOS_ERROR
} from './helpers';

// Runs as otro, with every write dated in the past so no month total moves.
const created: string[] = [];
const createdAccounts: string[] = [];

test.beforeEach(async ({ page }) => {
	await login(page, OTHER_EMAIL);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
	for (const href of createdAccounts.splice(0)) await postDelete(page, baseURL!, href);
});

const openDetail = async (page: Page, desc: string, currency: 'ARS' | 'USD' = 'ARS') => {
	await page.goto(`/movements?q=${encodeURIComponent(desc)}&currency=${currency}&all=1`);
	await page.getByText(desc).click();
	const drawer = page.getByRole('dialog');
	await expect(drawer).toBeVisible();
	return drawer;
};

test('USD keeps its cents', async ({ page }) => {
	const desc = unique(created, 'USD centavos');
	await fillMovement(page, {
		type: 'Ingreso',
		amount: '12,34',
		date: '2024-02-29',
		description: desc,
		account: 'Otra cuenta',
		category: 'Ajena'
	});
	await save(page).click();
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();
	const drawer = await openDetail(page, desc, 'USD');
	await expect(drawer.getByRole('button', { name: 'Monto: 12,34' })).toContainText('US$12,34');
});

test('an ARS whole amount shows without decimals in the list, the detail and the balance', async ({
	page,
	baseURL
}) => {
	const account = `ARS entera ${Date.now()}`;
	const id = await createAccount(page, baseURL!, account, 'ARS', '10000');
	createdAccounts.push(`${baseURL}/accounts/${id}`);
	const desc = unique(created, 'ARS entero');
	await fillMovement(page, {
		type: 'Gasto',
		amount: '1500',
		date: '2024-02-29',
		description: desc,
		account,
		category: 'Ajena'
	});
	await save(page).click();
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();

	await page.goto(`/movements?q=${encodeURIComponent(desc)}&all=1`);
	const row = page.locator('a', { hasText: desc });
	await expect(row).toContainText('-$1.500');
	await row.click();
	await expect(page.getByRole('dialog').getByRole('button', { name: 'Monto: 1.500' })).toHaveText(
		/^\s*\$1\.500\s*$/
	);

	await page.goto('/accounts');
	await expect(page.locator('[role="listitem"]', { hasText: account })).toContainText('$8.500');
});

test('a USD to ARS transfer rejects a non-whole rate and saves a whole one', async ({ page }) => {
	const desc = unique(created, 'Transferencia entera');
	await fillMovement(page, {
		type: 'Transferencia',
		amount: '10,01',
		date: '2024-02-29',
		description: desc,
		account: 'Otra cuenta',
		destination: 'Otra cuenta pesos'
	});
	await expect(page.getByRole('button', { name: /^Categoría/ })).toHaveCount(0);
	const dest = page.locator('p', { hasText: 'En destino' });
	await expect(dest).toContainText('—');
	await fillRate(page, '1234,5');
	await save(page).click();
	await expect(page.getByText(/en pesos enteros y mayor a cero/)).toBeVisible();
	await expect(page.getByRole('dialog', { name: 'Nuevo movimiento' })).toBeVisible();
	await expect(page).toHaveURL(/\/$/);

	await fillRate(page, '1234');
	await expect(dest).toContainText('$12.352');
	await expect(page.getByRole('button', { name: /^Cotización/ })).toContainText('1 USD = $1.234');
	await save(page).click();
	await expect(page.getByText('Movimiento guardado.')).toBeVisible();
	const drawer = await openDetail(page, desc, 'USD');
	await expect(drawer.locator('p', { hasText: 'En destino' })).toContainText('$12.352');
});

test('account initial balance: ARS whole only and USD keeps cents', async ({ page, baseURL }) => {
	const create = async (name: string, currency: 'ARS' | 'USD', balance: string) => {
		await gotoHydrated(page, '/accounts/new');
		await page.getByLabel('Nombre').fill(name);
		await page.getByRole('radio', { name: currency === 'ARS' ? 'Pesos' : 'Dólares' }).check();
		await page.getByLabel('Saldo inicial').fill(balance);
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	};

	await create(`ARS cuenta ${Date.now()}`, 'ARS', '100,50');
	await expect(page.getByText(WHOLE_PESOS_ERROR)).toBeVisible();
	await expect(page.getByLabel('Saldo inicial')).toHaveValue('100,50');
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page).toHaveURL(/\/accounts$/);

	const usd = `USD cuenta ${Date.now()}`;
	await create(usd, 'USD', '100,50');
	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(page).toHaveURL(/\/accounts$/);
	const id = await idByName('financial_accounts', OTHER_EMAIL, usd);
	createdAccounts.push(`${baseURL}/accounts/${id}`);
});
