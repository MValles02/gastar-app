import { expect, test, type Locator } from '@playwright/test';
import { login, OTHER_EMAIL, postDelete, undo, gotoHydrated, waitForHydration } from './helpers';

// Created accounts (detail URLs) are removed in afterEach. Runs as otro so the demo user's totals stay untouched.
const createdAccounts: string[] = [];

test.afterEach(async ({ page, baseURL }) => {
	for (const href of createdAccounts.splice(0)) await postDelete(page, baseURL!, href);
});

test('an account name autosaves, survives a reload and Deshacer restores it', async ({ page }) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts/new');
	const name = `Forms ${Date.now()}`;
	await page.getByLabel('Nombre').fill(name);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	createdAccounts.push(page.url());
	await waitForHydration(page);

	const h1 = page.getByRole('heading', { level: 1 });
	await page.getByRole('button', { name: `Nombre: ${name}` }).click();
	await page.getByLabel('Nombre').fill(`${name} 2`);
	await page.keyboard.press('Enter');
	await expect(page.getByText('Cambio guardado.')).toBeVisible();
	await page.reload();
	await expect(h1).toHaveText(`${name} 2`);
	await waitForHydration(page);
	await page.getByRole('button', { name: `Nombre: ${name} 2` }).click();
	await page.getByLabel('Nombre').fill(name);
	await page.keyboard.press('Enter');
	await expect(page.getByText('Cambio guardado.')).toBeVisible();
	await undo(page);
	await expect(h1).toHaveText(`${name} 2`);
	await page.reload();
	await expect(h1).toHaveText(`${name} 2`);
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

test('an account without movements can be archived or deleted', async ({ page }) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts/new');
	const name = `Forms acciones ${Date.now()}`;
	await page.getByLabel('Nombre').fill(name);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	const url = page.url();
	createdAccounts.push(url);

	await expect(page.getByRole('button', { name: 'Archivar' })).toBeVisible();
	await gotoHydrated(page, url);
	await page.getByRole('button', { name: 'Eliminar' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
	await expect(page).toHaveURL(/\/accounts$/);
	await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
	createdAccounts.pop();
});

test('archiving an account hides it from the new-movement picker and Desarchivar brings it back', async ({
	page
}) => {
	await login(page, OTHER_EMAIL);
	const name = `Forms archivo ${Date.now()}`;
	await page.goto('/accounts/new');
	await page.getByLabel('Nombre').fill(name);
	await page.getByLabel('Saldo inicial').fill('1234');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	const url = page.url();
	createdAccounts.push(url);

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
	await expect(page).toHaveURL(url);
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
