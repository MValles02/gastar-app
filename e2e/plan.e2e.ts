import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	deleteRules,
	fillMovement,
	fillRule,
	findMovements,
	linkId,
	login,
	OTHER_EMAIL,
	pick,
	postDelete,
	WHOLE_PESOS_ERROR
} from './helpers';

const rule = (page: Page, text: string) => page.locator('.rule', { hasText: text });

test('seeded rules: rent is paid and the gym is inactive', async ({ page }) => {
	await login(page);
	await page.goto('/plan');
	const rent = rule(page, 'Alquiler');
	await expect(rent).toContainText('Pagado');
	await expect(rent).toContainText('Día 3');

	const inactive = page.getByRole('region', { name: 'Inactivos' });
	await expect(inactive).toContainText('Gimnasio');
	await expect(inactive).toContainText('Cuenta archivada');
});

test('a rule detail autosaves its amount with Deshacer, deactivates, activates and deletes', async ({
	page,
	baseURL
}) => {
	await login(page, OTHER_EMAIL);
	const description = 'Ciclo e2e';
	try {
		await fillRule(page, {
			description,
			amount: '900',
			day: '20',
			account: 'Otra cuenta pesos',
			category: 'Ajena'
		});
		await page.getByRole('button', { name: 'Guardar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		await rule(page, description).locator('a[data-slot="item"]').click();
		await expect(page).toHaveURL(/\/plan\/recurring\/[0-9a-f-]{36}$/);

		const amount = page.getByRole('button', { name: /^Monto:/ });
		await amount.click();
		await page.getByRole('textbox', { name: 'Monto' }).fill('1200');
		await page.getByRole('textbox', { name: 'Monto' }).press('Enter');
		await expect(amount).toContainText('1.200');
		await page.reload();
		await expect(page.getByRole('button', { name: /^Monto:/ })).toContainText('1.200');
		await page.getByRole('button', { name: 'Monto:' }).click();
		await page.getByRole('textbox', { name: 'Monto' }).fill('900');
		await page.getByRole('textbox', { name: 'Monto' }).press('Enter');
		await expect(amount).toContainText('900');
		await page.getByRole('button', { name: 'Deshacer' }).click();
		await expect(amount).toContainText('1.200');

		await page.getByRole('button', { name: 'Desactivar' }).click();
		await expect(page.getByRole('button', { name: 'Activar', exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Activar', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Desactivar' })).toBeVisible();

		await page.getByRole('button', { name: 'Eliminar' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(page.getByText(description)).toHaveCount(0);
	} finally {
		await deleteRules(page, baseURL!, description);
	}
});

test('create a rule rejects ARS decimals and saves whole pesos', async ({ page, baseURL }) => {
	await login(page, OTHER_EMAIL);
	const description = 'Prueba e2e';
	try {
		await fillRule(page, {
			description,
			amount: '1.500,50',
			day: '15',
			account: 'Otra cuenta pesos',
			category: 'Ajena'
		});
		await page.getByRole('button', { name: 'Guardar' }).click();
		await expect(page.getByText(WHOLE_PESOS_ERROR)).toBeVisible();
		await expect(page.locator('input[name="amount"]')).toHaveValue(/^1\.?500,50$/);
		await expect(page).toHaveURL(/\/plan\/recurring\/new$/);

		await page.locator('input[name="amount"]').fill('1.500');
		await page.getByRole('button', { name: 'Guardar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		const row = rule(page, description);
		await expect(row).toBeVisible();
		await expect(row).toContainText('Día 15');
	} finally {
		await deleteRules(page, baseURL!, description);
	}
});

test('a payment edited to an account in another currency no longer marks the rule Pagado', async ({
	page,
	baseURL
}) => {
	await login(page, OTHER_EMAIL);
	const description = 'Pago moneda e2e';
	try {
		await fillRule(page, {
			description,
			amount: '1.500',
			day: '15',
			account: 'Otra cuenta pesos',
			category: 'Ajena'
		});
		await page.getByRole('button', { name: 'Guardar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		// A payment with the rule's description (any case) on a pesos account links itself to the rule.
		await fillMovement(page, {
			type: 'Gasto',
			amount: '1.500',
			description: description.toUpperCase(),
			account: 'Otra cuenta pesos',
			category: 'Ajena'
		});
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();
		await page.goto('/plan');
		await expect(rule(page, description)).toContainText('Pagado');

		const [href] = await findMovements(page, description.toUpperCase(), 'ARS');
		await page.goto(new URL(href).pathname);
		await pick(page, 'Cuenta', 'Otra cuenta');
		await expect(page.getByText('Cambio guardado.')).toBeVisible();

		await page.goto('/plan');
		await expect(rule(page, description)).toBeVisible();
		await expect(rule(page, description)).not.toContainText('Pagado');
	} finally {
		for (const href of await findMovements(page, description, 'USD'))
			await postDelete(page, baseURL!, href);
		await deleteMovements(page, baseURL!, description);
		await deleteRules(page, baseURL!, description);
	}
});

test("another user's rule is a 404, and so is the old edit route", async ({
	page,
	browser,
	baseURL
}) => {
	const otherContext = await browser.newContext({ baseURL });
	let id: string;
	try {
		const otherPage = await otherContext.newPage();
		await login(otherPage, OTHER_EMAIL);
		await otherPage.goto('/plan');
		id = await linkId(otherPage.getByRole('link', { name: /Regla ajena/ }).first());
	} finally {
		await otherContext.close();
	}
	await login(page);
	expect((await page.goto(`/plan/recurring/${id}`))!.status()).toBe(404);
	// A malformed id is a 404 too.
	expect((await page.goto('/plan/recurring/x'))!.status()).toBe(404);
	await page.goto('/plan');
	const own = await linkId(page.locator('.rule a[data-slot="item"]').first());
	expect((await page.goto(`/plan/recurring/${own}/edit`))!.status()).toBe(404);
});
