import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	deleteRules,
	fillRule,
	linkId,
	login,
	OTHER_EMAIL,
	PHONE,
	setCurrencyCookie,
	SMALL_PHONE,
	WHOLE_PESOS_ERROR
} from './helpers';

const rule = (page: Page, text: string) => page.locator('.rule', { hasText: text });

test('seeded rules: rent is paid, the gym is inactive and cannot be registered', async ({
	page
}) => {
	await login(page);
	await page.goto('/plan', { waitUntil: 'networkidle' });
	const rent = rule(page, 'Alquiler');
	await expect(rent).toContainText('Pagado');
	await expect(rent).toContainText('Día 3');
	await expect(rent.getByRole('link', { name: /Registrar/ })).toHaveCount(0);

	const inactive = page.getByRole('region', { name: 'Inactivos' });
	await expect(inactive).toContainText('Gimnasio');
	await expect(inactive).toContainText('Cuenta archivada');
	// Inactive rows are fully greyed: the amount is not in the title's text colour.
	const gym = inactive.locator('.rule', { hasText: 'Gimnasio' });
	const color = (sel: string) => gym.locator(sel).evaluate((el) => getComputedStyle(el).color);
	expect(await color('.amount-col')).not.toBe(await color('[data-slot="item-title"]'));
	const id = await linkId(inactive.getByRole('link', { name: /Gimnasio/ }));
	await page.goto(`/movements/new?recurring=${id}`, { waitUntil: 'networkidle' });
	await expect(page.getByRole('heading', { level: 1, name: 'Nuevo movimiento' })).toBeVisible();
	await expect(page.locator('input[name="recurringId"]')).toHaveCount(0);
});

test('a rule on an archived account can be edited and stays inactive', async ({ page }) => {
	await login(page);
	await page.goto('/plan', { waitUntil: 'networkidle' });
	const link = page
		.getByRole('region', { name: 'Inactivos' })
		.getByRole('link', { name: /Gimnasio/ });
	const href = await link.evaluate((a: HTMLAnchorElement) => a.pathname);
	const edit = async (description: string) => {
		await page.goto(href, { waitUntil: 'networkidle' });
		await page.locator('input[name="description"]').fill(description);
		await page.getByRole('button', { name: 'Guardar cambios' }).click();
		await expect(page).toHaveURL(/\/plan$/);
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

test('rule rows sit flush in the list card at 390px', async ({ page }) => {
	await page.setViewportSize(PHONE);
	await login(page);
	await page.goto('/plan', { waitUntil: 'networkidle' });
	const row = page.locator('.rule').first();
	const list = await row.locator('xpath=..').boundingBox();
	const main = await row.locator('a[data-slot="item"]').boundingBox();
	// 1px list border, no extra padding.
	expect(main!.x - list!.x).toBeLessThanOrEqual(2);
});

test('rule text does not wrap per character at 320px and 200% text', async ({ page }) => {
	await page.setViewportSize(SMALL_PHONE);
	await login(page);
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
	const title = rule(page, 'Alquiler').locator('[data-slot="item-title"]');
	const { height, lineHeight } = await title.evaluate((el) => {
		const cs = getComputedStyle(el);
		const fs = parseFloat(cs.fontSize);
		return {
			height: el.getBoundingClientRect().height,
			lineHeight: cs.lineHeight === 'normal' ? fs * 1.3 : parseFloat(cs.lineHeight)
		};
	});
	expect(height).toBeLessThanOrEqual(lineHeight * 2.1);
});

test('empty new rule form shows every required-field message', async ({ page }) => {
	await login(page);
	await page.goto('/plan/recurring/new', { waitUntil: 'networkidle' });
	await page.locator('input[name="dayOfMonth"]').fill('');
	await page.getByRole('button', { name: 'Guardar' }).click();
	await expect(page).toHaveURL(/\/plan\/recurring\/new$/);
	for (const message of [
		'Ingresá una descripción.',
		'Ingresá un monto mayor a cero (ej.: 1.234 en pesos o 1.234,56 en dólares).',
		'Elegí una cuenta.',
		'Elegí una categoría.',
		'Elegí un día entre 1 y 31.'
	])
		await expect(page.getByText(message)).toBeVisible();
});

test('archive, reactivate and delete a rule', async ({ page, baseURL }) => {
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
			await page.goto('/plan', { waitUntil: 'networkidle' });
			await page
				.getByRole('link', { name: new RegExp(description) })
				.first()
				.click();
		};

		await rule(page, description).locator('a[data-slot="item"]').click();
		await page.getByRole('button', { name: 'Archivar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(inactive).toContainText(description);
		await expect(inactive).toContainText('Archivado');

		await open();
		await page.getByRole('button', { name: 'Reactivar' }).click();
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

test('USD tab shows the empty state', async ({ page, baseURL }) => {
	await login(page);
	await setCurrencyCookie(page, baseURL!, 'USD');
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(page.getByText('No tenés pagos ni ingresos fijos en dólares.')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Agregar pago fijo' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Agregar ingreso fijo' })).toBeVisible();
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
		await page.getByRole('button', { name: 'Guardar movimiento' }).click();

		await expect(page.getByText('Pago registrado.')).toBeVisible();
		await expect(rule(page, description)).toContainText('Pagado');
		await expect(rule(page, description).getByRole('link', { name: /Registrar/ })).toHaveCount(0);
	} finally {
		await deleteMovements(page, baseURL!, description);
		await deleteRules(page, baseURL!, description);
	}
});

for (const id of ['00000000-0000-4000-8000-000000000000', 'x']) {
	test(`/plan/recurring/${id} is a 404`, async ({ page }) => {
		await login(page);
		const res = await page.goto(`/plan/recurring/${id}`);
		expect(res!.status()).toBe(404);
		await expect(page.getByText('Movimiento fijo no encontrado.')).toBeVisible();
	});
}

test("another user's rule is a 404", async ({ page, browser, baseURL }) => {
	const otherContext = await browser.newContext({ baseURL });
	let id: string;
	try {
		const otherPage = await otherContext.newPage();
		await login(otherPage, OTHER_EMAIL);
		await setCurrencyCookie(otherPage, baseURL!, 'USD');
		await otherPage.goto('/plan', { waitUntil: 'networkidle' });
		id = await linkId(otherPage.getByRole('link', { name: /Regla ajena/ }).first());
	} finally {
		await otherContext.close();
	}
	await login(page);
	const res = await page.goto(`/plan/recurring/${id}`);
	expect(res!.status()).toBe(404);
	await expect(page.getByText('Movimiento fijo no encontrado.')).toBeVisible();
});
