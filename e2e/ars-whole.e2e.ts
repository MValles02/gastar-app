import { expect, test, type Page } from '@playwright/test';
import {
	createAccount,
	deleteMovements,
	fillMovement,
	fillRate,
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

test('an ARS amount with decimals is rejected and the value kept', async ({ page }) => {
	await fillMovement(page, {
		type: 'Gasto',
		amount: '1.500,50',
		description: unique(created, 'ARS decimales'),
		account: 'Otra cuenta pesos',
		category: 'Ajena'
	});
	await save(page).click();
	await expect(page.getByText(WHOLE_PESOS_ERROR)).toBeVisible();
	await expect(page.locator('input[name="amount"]')).toHaveValue(/^1\.?500,50$/);
	await expect(page).toHaveURL(/\/movements\/new$/);
});

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

test('a USD to ARS transfer converts to whole pesos and rejects a non-whole rate', async ({
	page
}) => {
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
	await expect(page).toHaveURL(/\/movements\/new$/);

	await fillRate(page, '1234');
	await expect(dest).toContainText('$12.352');
	await expect(page.getByRole('button', { name: /^Cotización/ })).toContainText('1 USD = $1.234');
	await save(page).click();
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
	await expect(dest).toContainText('$1');
	await fillMovement(page, {
		type: 'Transferencia',
		amount: '12352',
		description: 'Vista previa',
		account: 'Otra cuenta pesos',
		destination: 'Otra cuenta',
		rate: '1234'
	});
	await expect(dest).toContainText('US$10,01');
});

test('account initial balance: ARS whole only, USD keeps cents, edit prefills the stored value', async ({
	page
}) => {
	const create = async (name: string, currency: 'ARS' | 'USD', balance: string) => {
		await page.goto('/accounts/new');
		await page.getByLabel('Nombre').fill(name);
		await page
			.getByRole('radio', { name: currency === 'ARS' ? 'Pesos' : 'Dólares' })
			.check({ force: true });
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
	await page.waitForLoadState('networkidle'); // hydration guard: the inline edit needs JS
	// scripts/seed.js: Otra cuenta pesos starts at 500.000.
	await page.getByRole('button', { name: 'Saldo inicial: 500.000' }).click();
	await expect(page.getByLabel('Saldo inicial')).toHaveValue('500.000');
	await page.getByLabel('Saldo inicial').fill('100,50');
	await page.keyboard.press('Enter');
	await expect(page.getByText(WHOLE_PESOS_ERROR)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Saldo inicial: 500.000' })).toBeVisible();
});
