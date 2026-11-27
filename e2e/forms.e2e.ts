import { expect, test, type Locator, type Page } from '@playwright/test';
import { idByName, login, OTHER_EMAIL, postDelete, undo, gotoHydrated } from './helpers';

// Created accounts (detail URLs) are removed in afterEach. Runs as otro so the demo user's totals stay untouched.
const createdAccounts: string[] = [];

test.afterEach(async ({ page, baseURL }) => {
	for (const href of createdAccounts.splice(0)) await postDelete(page, baseURL!, href);
});

/** Creates an account in the new-account drawer (it closes on /accounts). Returns the detail URL. */
async function createAccountVia(page: Page, baseURL: string, name: string, balance?: string) {
	await gotoHydrated(page, '/accounts/new');
	await page.getByLabel('Nombre').fill(name);
	if (balance) await page.getByLabel('Saldo inicial').fill(balance);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(page).toHaveURL(/\/accounts$/);
	const url = `${baseURL}/accounts/${await idByName('financial_accounts', OTHER_EMAIL, name)}`;
	createdAccounts.push(url);
	return url;
}

test('an account name autosaves, survives a reload and Deshacer restores it', async ({
	page,
	baseURL
}) => {
	await login(page, OTHER_EMAIL);
	const name = `Forms ${Date.now()}`;
	const url = await createAccountVia(page, baseURL!, name);
	await gotoHydrated(page, url);

	const nameButton = (n: string) =>
		page.getByRole('dialog').getByRole('button', { name: `Nombre: ${n}` });
	await page.getByRole('button', { name: `Nombre: ${name}` }).click();
	await page.getByLabel('Nombre').fill(`${name} 2`);
	await page.keyboard.press('Enter');
	await expect(page.getByText('Cambio guardado.')).toBeVisible();
	// A reload of the parent drops the drawer: reopen it from its URL.
	await gotoHydrated(page, url);
	await expect(nameButton(`${name} 2`)).toBeVisible();
	await page.getByRole('button', { name: `Nombre: ${name} 2` }).click();
	await page.getByLabel('Nombre').fill(name);
	await page.keyboard.press('Enter');
	await expect(page.getByText('Cambio guardado.')).toBeVisible();
	await undo(page);
	await expect(nameButton(`${name} 2`)).toBeVisible();
	await gotoHydrated(page, url);
	await expect(nameButton(`${name} 2`)).toBeVisible();
});

test('an account with movements opens as a sheet without Eliminar and a crafted delete is rejected', async ({
	page,
	baseURL
}) => {
	await login(page);
	await gotoHydrated(page, '/accounts');
	const row = page.getByRole('link', { name: /Efectivo/ }).first();
	const href = (await row.getAttribute('href'))!;
	await row.click();
	const sheet = page.getByRole('dialog');
	await expect(sheet.getByRole('button', { name: 'Archivar' })).toBeVisible();
	await expect(sheet.getByRole('button', { name: 'Eliminar' })).toHaveCount(0);
	await expect(page).toHaveURL(/\/accounts$/);
	const res = await page.request.post(`${href}?/delete`, {
		form: {},
		headers: { origin: baseURL!, 'x-sveltekit-action': 'true' }
	});
	expect((await res.json()).type).toBe('failure');
});

test('an account without movements can be archived or deleted', async ({ page, baseURL }) => {
	await login(page, OTHER_EMAIL);
	const name = `Forms acciones ${Date.now()}`;
	const url = await createAccountVia(page, baseURL!, name);

	await gotoHydrated(page, url);
	await expect(page.getByRole('button', { name: 'Archivar' })).toBeVisible();
	await page.getByRole('button', { name: 'Eliminar' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
	await expect(page).toHaveURL(/\/accounts$/);
	await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
	createdAccounts.pop();
});

test('archiving an account hides it from the new-movement picker and Desarchivar brings it back', async ({
	page,
	baseURL
}) => {
	await login(page, OTHER_EMAIL);
	const name = `Forms archivo ${Date.now()}`;
	const url = await createAccountVia(page, baseURL!, name, '1234');

	/** How many times the new-movement account picker offers the account. */
	const offered = async () => {
		await gotoHydrated(page, '/movements/new');
		await page.getByRole('button', { name: /^Cuenta/ }).click();
		const dialog = page.getByRole('dialog').last();
		await expect(dialog).toBeVisible();
		return dialog.getByText(name, { exact: true }).count();
	};
	expect(await offered()).toBe(1);

	await gotoHydrated(page, url);
	await page.getByRole('button', { name: 'Archivar' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Archivar' }).click();
	await expect(page.getByText('No aparece al registrar movimientos.')).toBeVisible();
	await expect(page).toHaveURL(/\/accounts$/);
	expect(await offered()).toBe(0);
	// Archived accounts stay listed but leave the group total, by exactly their balance. One page snapshot,
	// so other workers moving this user's balances cannot skew the comparison.
	await page.goto('/accounts?archived=1');
	const group = page.locator('section[aria-labelledby="group-ARS"]');
	const rows = group.locator('a:has(.amount)');
	const cents = async (l: Locator) =>
		Math.round(
			Number(
				(await l.innerText())
					.replace('\u2212', '-')
					.replace(/\./g, '')
					.replace(',', '.')
					.replace(/[^\d.-]/g, '')
			) * 100
		);
	const mine = rows.filter({ hasText: name });
	await expect(mine).toHaveCount(1);
	expect(await cents(mine.locator('.amount'))).toBe(123400);
	const active = rows.filter({ hasNotText: 'Archivada' }).locator('.amount');
	let sum = 0;
	for (const amount of await active.all()) sum += await cents(amount);
	expect(await cents(group.locator('.group-total'))).toBe(sum);
	await gotoHydrated(page, url);
	await page.getByRole('button', { name: 'Desarchivar' }).click();
	await expect(page.getByRole('button', { name: 'Archivar', exact: true })).toBeVisible();
	expect(await offered()).toBe(1);
});
