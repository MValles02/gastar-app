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
	postDelete,
	setCurrencyCookie,
	WHOLE_PESOS_ERROR
} from './helpers';

const rule = (page: Page, text: string) => page.locator('.rule', { hasText: text });

test('seeded rules: rent is paid, the gym is inactive and cannot be registered', async ({
	page
}) => {
	await login(page);
	await page.goto('/plan');
	const rent = rule(page, 'Alquiler');
	await expect(rent).toContainText('Pagado');
	await expect(rent).toContainText('Día 3');
	await expect(rent.getByRole('link', { name: /Registrar/ })).toHaveCount(0);

	const inactive = page.getByRole('region', { name: 'Inactivos' });
	await expect(inactive).toContainText('Gimnasio');
	await expect(inactive).toContainText('Cuenta archivada');
	const id = await linkId(inactive.getByRole('link', { name: /Gimnasio/ }));
	await page.goto(`/movements/new?recurring=${id}`);
	await expect(page.getByRole('heading', { level: 1, name: 'Nuevo movimiento' })).toBeVisible();
	await expect(page.locator('input[name="recurringId"]')).toHaveCount(0);
});

test('a rule on an archived account can be edited and stays inactive', async ({ page }) => {
	await login(page);
	await page.goto('/plan');
	const link = page
		.getByRole('region', { name: 'Inactivos' })
		.getByRole('link', { name: /Gimnasio/ });
	const href = await link.evaluate((a: HTMLAnchorElement) => a.pathname);
	const edit = async (description: string) => {
		await page.goto(`${href}/edit`);
		await page.locator('input[name="description"]').fill(description);
		await page.getByRole('button', { name: 'Guardar cambios' }).click();
		await expect(page).toHaveURL(href);
		await page.goto('/plan');
		await expect(
			page.getByRole('region', { name: 'Inactivos' }).getByText(description)
		).toBeVisible();
	};
	try {
		await edit('Gimnasio e2e');
		await expect(page.getByRole('region', { name: 'Inactivos' })).toContainText('Cuenta archivada');
	} finally {
		await edit('Gimnasio');
	}
});

test('deactivate, activate and delete a rule', async ({ page, baseURL }) => {
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
		const inactive = page.getByRole('region', { name: 'Inactivos' });
		const open = async () => {
			await page.goto('/plan');
			await page
				.getByRole('link', { name: new RegExp(description) })
				.first()
				.click();
		};

		await rule(page, description).locator('a[data-slot="item"]').click();
		await page.getByRole('button', { name: 'Desactivar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(inactive).toContainText(description);
		await expect(inactive).toContainText('Desactivado');

		await open();
		await page.getByRole('button', { name: 'Activar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(rule(page, description)).toBeVisible();
		await expect(
			page.getByRole('region', { name: 'Inactivos' }).filter({ hasText: description })
		).toHaveCount(0);

		await open();
		await page.getByRole('button', { name: 'Eliminar' }).click();
		await expect(page.getByText('¿Eliminar este movimiento fijo?')).toBeVisible();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(page.getByText(description)).toHaveCount(0);
	} finally {
		await deleteRules(page, baseURL!, description);
	}
});

test('create a rule, register its payment and clean up', async ({ page, baseURL }) => {
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

		await row.getByRole('link').click();
		await page.getByRole('link', { name: 'Registrar pago' }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Registrar pago' })).toBeVisible();
		await expect(page.locator('input[name="description"]')).toHaveValue(description);
		await expect(page.locator('input[name="amount"]')).toHaveValue(/^1\.?500$/);
		await expect(page.locator('input[name="recurringId"]')).toHaveCount(1);
		await expect(page.getByText(`Registrás el pago de ${description} de este mes.`)).toBeVisible();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();

		await expect(page.getByText('Pago registrado.')).toBeVisible();
		await expect(rule(page, description)).toContainText('Pagado');
		await expect(rule(page, description).getByRole('link', { name: /Registrar/ })).toHaveCount(0);
	} finally {
		await deleteMovements(page, baseURL!, description);
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
		await rule(page, description).getByRole('link').click();
		await page.getByRole('link', { name: 'Registrar pago' }).click();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(rule(page, description)).toContainText('Pagado');

		const [href] = await findMovements(page, description, 'ARS');
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

test("another user's rule is a 404", async ({ page, browser, baseURL }) => {
	const otherContext = await browser.newContext({ baseURL });
	let id: string;
	try {
		const otherPage = await otherContext.newPage();
		await login(otherPage, OTHER_EMAIL);
		await setCurrencyCookie(otherPage, baseURL!, 'USD');
		await otherPage.goto('/plan');
		id = await linkId(otherPage.getByRole('link', { name: /Regla ajena/ }).first());
	} finally {
		await otherContext.close();
	}
	await login(page);
	const res = await page.goto(`/plan/recurring/${id}`);
	expect(res!.status()).toBe(404);
	await expect(page.getByText('Movimiento fijo no encontrado.')).toBeVisible();
	// A malformed id is a 404 too.
	expect((await page.goto('/plan/recurring/x'))!.status()).toBe(404);
});
