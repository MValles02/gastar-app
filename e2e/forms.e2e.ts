import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	deleteRules,
	fillRule,
	findMovements,
	linkId,
	login,
	OTHER_EMAIL,
	postDelete
} from './helpers';

// Created accounts (detail URLs) are removed in afterEach. Runs as otro so the demo user's totals stay untouched.
const createdAccounts: string[] = [];

test.afterEach(async ({ page, baseURL }) => {
	for (const href of createdAccounts.splice(0)) await postDelete(page, baseURL!, href);
});

/** Presses Deshacer on the toast and waits for it to go. */
async function undo(page: Page) {
	await page.getByRole('button', { name: 'Deshacer' }).first().click();
	await expect(page.getByText('Cambio guardado.')).toHaveCount(0);
}

test('a new account keeps its icon and color; each detail change autosaves and Deshacer restores it', async ({
	page
}) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts/new');
	await page.waitForLoadState('networkidle'); // hydration guard: the icon and color drawer needs JS
	const name = `Forms ${Date.now()}`;
	await page.getByLabel('Nombre').fill(name);

	const dialog = page.getByRole('dialog');
	await page.getByRole('button', { name: 'Ícono y color' }).click();
	await dialog.getByRole('radio', { name: 'Banco' }).click();
	await dialog.getByRole('radio', { name: 'Naranja' }).click();
	await dialog.getByRole('button', { name: 'Listo' }).click();
	await expect(dialog).toBeHidden();
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	createdAccounts.push(page.url());
	await page.waitForLoadState('networkidle'); // hydration guard: the inline edits need JS

	// Ícono y color: the creation choice shows, Listo autosaves, Deshacer restores both.
	const glyph = page.getByRole('button', { name: 'Ícono y color' });
	await glyph.click();
	await expect(dialog.getByRole('radio', { name: 'Banco' })).toBeChecked();
	await expect(dialog.getByRole('radio', { name: 'Naranja' })).toBeChecked();
	await dialog.getByRole('radio', { name: 'Billetera' }).click();
	await dialog.getByRole('radio', { name: 'Azul' }).click();
	await dialog.getByRole('button', { name: 'Listo' }).click();
	await expect(page.getByText('Cambio guardado.')).toBeVisible();
	await undo(page);
	await glyph.click();
	await expect(dialog.getByRole('radio', { name: 'Banco' })).toBeChecked();
	await expect(dialog.getByRole('radio', { name: 'Naranja' })).toBeChecked();
	await dialog.getByRole('button', { name: 'Cancelar' }).click();

	// Nombre: saves on Enter, survives a reload, Deshacer brings the old name back.
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

test('an income rule registers as "Registrar ingreso" with no type selector, with and without JS', async ({
	page,
	browser,
	baseURL
}) => {
	await login(page, OTHER_EMAIL);
	const description = `Forms ingreso ${Date.now()}`;
	try {
		await fillRule(page, {
			description,
			amount: '700',
			day: '15',
			account: 'Otra cuenta pesos',
			category: 'Ajena',
			type: 'income'
		});
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/plan$/);
		const ruleId = await linkId(page.getByRole('link', { name: new RegExp(description) }));
		const form = `/movements/new?recurring=${ruleId}`;

		await page.goto(form);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Registrar ingreso');
		await expect(page.getByRole('radio', { name: /^(Ingreso|Gasto|Transf\.)$/ })).toHaveCount(0);
		await expect(page.locator('input[name="type"]')).toHaveValue('income');
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/plan$/);

		// No JS: the server-rendered form has no type selector or transfer fields and still saves an income.
		const noJs = await browser.newContext({
			baseURL,
			javaScriptEnabled: false,
			storageState: await page.context().storageState()
		});
		try {
			const bare = await noJs.newPage();
			await bare.goto(form);
			await expect(bare.getByRole('heading', { level: 1 })).toHaveText('Registrar ingreso');
			await expect(bare.locator('input[name="type"][type="radio"]')).toHaveCount(0);
			await expect(bare.locator('[name="destinationAccountId"]')).toHaveCount(0);
			await bare.getByRole('button', { name: 'Guardar', exact: true }).click();
			await expect(bare).toHaveURL(/\/plan\?saved=1$/);
		} finally {
			await noJs.close();
		}

		const movements = await findMovements(page, description);
		expect(movements).toHaveLength(2);
		for (const href of movements) {
			await page.goto(href);
			// The amount carries the type by colour (income green), not by a tag.
			await expect(page.getByRole('button', { name: /^Monto: / }).locator('.money')).toHaveClass(
				/income/
			);
		}
	} finally {
		await deleteMovements(page, baseURL!, description);
		await deleteRules(page, baseURL!, description);
	}
});

test('an account without movements can be archived or deleted, and links to its movements', async ({
	page
}) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts/new');
	const name = `Forms acciones ${Date.now()}`;
	await page.getByLabel('Nombre').fill(name);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	const url = page.url();
	createdAccounts.push(url);
	const id = url.split('/').pop();

	await expect(page.getByRole('button', { name: 'Archivar' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Ver movimientos' })).toHaveAttribute(
		'href',
		`/movements?account=${id}`
	);
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
	await page.goto(url, { waitUntil: 'networkidle' }); // hydration guard: the unarchive form is enhanced
	await page.getByRole('button', { name: 'Desarchivar' }).click();
	await expect(page.getByRole('button', { name: 'Archivar', exact: true })).toBeVisible();
	expect(await offered()).toBe(1);
});
