import { expect, test } from '@playwright/test';
import { login, OTHER_EMAIL, postDelete, undo } from './helpers';

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
	await page.waitForLoadState('networkidle'); // hydration guard: the inline edits need JS

	const h1 = page.getByRole('heading', { level: 1 });
	await page.getByRole('button', { name: `Nombre: ${name}` }).click();
	await page.getByLabel('Nombre').fill(`${name} 2`);
	await page.keyboard.press('Enter');
	await expect(page.getByText('Cambio guardado.')).toBeVisible();
	await page.reload();
	await expect(h1).toHaveText(`${name} 2`);
	await page.waitForLoadState('networkidle'); // hydration guard: the toast needs JS
	await page.getByRole('button', { name: `Nombre: ${name} 2` }).click();
	await page.getByLabel('Nombre').fill(name);
	await page.keyboard.press('Enter');
	await expect(page.getByText('Cambio guardado.')).toBeVisible();
	await undo(page);
	await expect(h1).toHaveText(`${name} 2`);
	await page.reload();
	await expect(h1).toHaveText(`${name} 2`);
});

test('an account with movements has no Eliminar and a crafted delete is rejected', async ({
	page,
	baseURL
}) => {
	await login(page);
	await page.goto('/accounts');
	await page
		.getByRole('link', { name: /Efectivo/ })
		.first()
		.click();
	await expect(page.getByRole('button', { name: 'Archivar' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Eliminar' })).toHaveCount(0);
	const res = await page.request.post(`${page.url()}?/delete`, {
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
	await page.goto(url);
	await page.waitForLoadState('networkidle'); // hydration guard: the confirm dialog needs JS
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
		await page.goto('/movements/new', { waitUntil: 'networkidle' }); // hydration guard: the picker needs JS
		await page.getByRole('button', { name: /^Cuenta/ }).click();
		const dialog = page.getByRole('dialog').last();
		await expect(dialog).toBeVisible();
		return dialog.getByText(name, { exact: true }).count();
	};
	expect(await offered()).toBe(1);

	await page.goto(url, { waitUntil: 'networkidle' }); // hydration guard: the archive form is enhanced
	await page.getByRole('button', { name: 'Archivar' }).click();
	await expect(page.getByText('No aparece al registrar movimientos.')).toBeVisible();
	await expect(page).toHaveURL(url);
	expect(await offered()).toBe(0);
	// Archived accounts stay listed, with their balance, only on request.
	await page.goto('/accounts');
	await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
	await page.goto('/accounts?archived=1');
	await expect(page.getByRole('link', { name: new RegExp(name) })).toContainText('$1.234');
	await page.goto(url, { waitUntil: 'networkidle' }); // hydration guard: the unarchive form is enhanced
	await page.getByRole('button', { name: 'Desarchivar' }).click();
	await expect(page.getByRole('button', { name: 'Archivar', exact: true })).toBeVisible();
	expect(await offered()).toBe(1);
});
