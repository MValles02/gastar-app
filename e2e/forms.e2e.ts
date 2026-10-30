import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	deleteRules,
	fillRule,
	findMovements,
	linkId,
	login,
	OTHER_EMAIL,
	pick,
	pickDay,
	postDelete
} from './helpers';

// Created accounts (detail URLs) are removed in afterEach. Runs as otro so the demo user's totals stay untouched.
const createdAccounts: string[] = [];

test.beforeEach(async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 667 });
});

test.afterEach(async ({ page, baseURL }) => {
	for (const href of createdAccounts.splice(0)) await postDelete(page, baseURL!, href);
});

test('the account form Saldo inicial shows the currency prefix and follows the toggle', async ({
	page
}) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts/new', { waitUntil: 'networkidle' });
	const row = page.locator('label[for="initialBalance"]');
	await expect(row.locator('.prefix')).toHaveText('$');
	await expect(page.getByLabel('Saldo inicial')).toHaveAttribute('placeholder', '0');
	await page.getByRole('radio', { name: 'USD' }).check({ force: true });
	await expect(row.locator('.prefix')).toHaveText('US$');
});

test('the account form picks icon and color in drawers and persists them', async ({ page }) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/accounts/new', { waitUntil: 'networkidle' });
	await page.getByLabel('Nombre').fill(`Forms ${Date.now()}`);

	await actionsVisible(page, /^Guardar$/);

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
	await page.goto(`${page.url()}/edit`, { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: /^Ícono/ }).click();
	await expect(page.getByRole('dialog').getByRole('radio', { name: 'Banco' })).toBeChecked();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: /^Color/ })).toContainText('Naranja');
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
	).toHaveCount(0);
	await expect(page.getByRole('radio', { name: 'USD' })).toHaveCount(0);
	await expect(page.locator('input[name="currency"]')).toHaveCount(0);
});

/** The sheet header: Cancelar top-left, the submit top-right, on one row at the top of the screen. */
async function actionsVisible(page: Page, submitName: RegExp) {
	const cancel = (await page.getByRole('link', { name: 'Cancelar' }).boundingBox())!;
	const submit = (await page.getByRole('button', { name: submitName }).boundingBox())!;
	expect(Math.abs(cancel.y - submit.y)).toBeLessThan(2);
	expect(cancel.x + cancel.width).toBeLessThan(submit.x);
	expect(submit.x + submit.width).toBeGreaterThan(375 / 2);
	expect(submit.y + submit.height).toBeLessThanOrEqual(120);
}

test('the movement form shows Transf. and both actions without scrolling', async ({ page }) => {
	await login(page);
	await page.goto('/movements/new', { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio', { name: 'Transf.' })).toBeAttached();
	await actionsVisible(page, /^Guardar$/);
});

test('the recurring form: type from ?type, title, day drawer', async ({ page, baseURL }) => {
	await login(page, OTHER_EMAIL);
	await page.goto('/plan/recurring/new', { waitUntil: 'networkidle' });
	await expect(page.getByRole('radio')).toHaveCount(0);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nuevo pago fijo');
	await expect(page.locator('input[name="type"]')).toHaveValue('outcome');
	await actionsVisible(page, /^Guardar$/);

	await page.goto('/plan/recurring/new?type=income', { waitUntil: 'networkidle' });
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nuevo ingreso fijo');
	await expect(page.locator('input[name="type"]')).toHaveValue('income');
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

		await page.goto(form, { waitUntil: 'networkidle' });
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
			await expect(page.getByRole('region', { name: 'Monto' })).toContainText('Ingreso');
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
	await page.goto('/accounts/new', { waitUntil: 'networkidle' });
	await page.getByLabel('Nombre').fill(`Forms acciones ${Date.now()}`);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	createdAccounts.push(page.url());
	const id = page.url().split('/').pop();

	const edit = (await page.getByRole('link', { name: 'Editar' }).boundingBox())!;
	const archive = (await page.getByRole('button', { name: 'Archivar' }).boundingBox())!;
	await expect(page.getByRole('button', { name: 'Eliminar' })).toBeVisible();
	expect(Math.abs(edit.y - archive.y)).toBeLessThan(2);
	expect(Math.abs(edit.width - archive.width)).toBeLessThan(2);

	const link = page.locator('.detail-card').getByRole('link', { name: 'Ver movimientos' });
	await expect(link).toHaveAttribute('href', `/movements?account=${id}`);
});
