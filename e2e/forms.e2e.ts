import { expect, test } from '@playwright/test';
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

test('the account form picks icon and color in drawers and persists them', async ({ page }) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts/new');
	await page.waitForLoadState('networkidle'); // hydration guard: the icon and color drawers needs JS
	await page.getByLabel('Nombre').fill(`Forms ${Date.now()}`);

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

	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	createdAccounts.push(page.url());
	await expect(page.getByText('Ícono y color')).toHaveCount(0);
	await page.goto(`${page.url()}/edit`);
	await page.waitForLoadState('networkidle'); // hydration guard: the icon and color drawers needs JS
	await page.getByRole('button', { name: /^Ícono/ }).click();
	await expect(page.getByRole('dialog').getByRole('radio', { name: 'Banco' })).toBeChecked();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: /^Color/ })).toContainText('Naranja');
});

test('a currency-locked account shows a read-only Moneda row', async ({ page }) => {
	await login(page);
	await page.goto('/accounts');
	await page
		.getByRole('link', { name: /Efectivo/ })
		.first()
		.click();
	await page.getByRole('link', { name: 'Editar' }).click();
	await expect(
		page.getByText('No se puede cambiar porque la cuenta tiene movimientos.')
	).toHaveCount(0);
	await expect(page.getByRole('radio', { name: 'USD' })).toHaveCount(0);
	await expect(page.locator('input[name="currency"]')).toHaveCount(0);
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

test('an account without movements offers Editar, Archivar and Eliminar, and links to its movements', async ({
	page
}) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts/new');
	await page.getByLabel('Nombre').fill(`Forms acciones ${Date.now()}`);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	createdAccounts.push(page.url());
	const id = page.url().split('/').pop();

	await expect(page.getByRole('link', { name: 'Editar' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Archivar' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Eliminar' })).toBeVisible();
	const link = page.locator('.detail-card').getByRole('link', { name: 'Ver movimientos' });
	await expect(link).toHaveAttribute('href', `/movements?account=${id}`);
});
