import { expect, test, type Page } from '@playwright/test';

// Same defaults as scripts/seed.js (local demo user, not a secret).
const email = process.env.SEED_EMAIL || 'demo@gastar.local';
const password = process.env.SEED_PASSWORD || 'demo1234';

async function login(page: Page, as = email) {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByLabel('Email').fill(as);
	await page.getByLabel('Contraseña').fill(password);
	await page.getByRole('button', { name: 'Ingresar' }).click();
	await expect(page).toHaveURL(/\/$/);
}

// Each test context sets its own cookie; reset it so specs stay independent.
test.afterEach(async ({ context, baseURL }) => {
	await context.addCookies([{ name: 'currency', value: 'ARS', url: baseURL! }]);
});

const rule = (page: Page, text: string) => page.locator('li.rule', { hasText: text });

async function pick(page: Page, legend: string, name: string) {
	await page.getByRole('button', { name: new RegExp(legend) }).click();
	await page.getByRole('dialog').getByText(name, { exact: true }).click();
}

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
	const href = await inactive
		.getByRole('link', { name: /Gimnasio/ })
		.evaluate((a: HTMLAnchorElement) => a.pathname);
	const id = href.split('/').pop()!;
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
	await page.setViewportSize({ width: 390, height: 844 });
	await login(page);
	await page.goto('/plan', { waitUntil: 'networkidle' });
	const row = page.locator('li.rule').first();
	const list = await row.locator('xpath=..').boundingBox();
	const main = await row.locator('a.main').boundingBox();
	// 1px list border, no extra padding.
	expect(main!.x - list!.x).toBeLessThanOrEqual(2);
});

test('rule text does not wrap per character at 320px and 200% text', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 640 });
	await login(page);
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
	const title = rule(page, 'Alquiler').locator('.title');
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
		'Ingresá un monto mayor a cero, con hasta 2 decimales (ej.: 1.234,56).',
		'Elegí una cuenta.',
		'Elegí una categoría.',
		'Elegí un día entre 1 y 31.'
	])
		await expect(page.getByText(message)).toBeVisible();
});

test('archive, reactivate and delete a rule', async ({ page, baseURL }) => {
	await login(page);
	const description = 'Ciclo e2e';
	try {
		await page.goto('/plan/recurring/new', { waitUntil: 'networkidle' });
		await page.locator('input[name="description"]').fill(description);
		await page.locator('input[name="amount"]').fill('900');
		await page.locator('input[name="dayOfMonth"]').fill('20');
		await pick(page, 'Cuenta', 'Mercado Pago');
		await pick(page, 'Categoría', 'Regalos');
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

		await rule(page, description).locator('a.main').click();
		await page.getByRole('button', { name: 'Archivar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(inactive).toContainText(description);
		await expect(inactive).toContainText('Archivado');

		await open();
		await page.getByRole('button', { name: 'Reactivar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(rule(page, description)).toBeVisible();
		await expect(page.getByRole('region', { name: 'Inactivos' })).not.toContainText(description);

		await open();
		await page.getByRole('button', { name: 'Eliminar' }).click();
		await expect(page.getByText('¿Eliminar este movimiento fijo?')).toBeVisible();
		await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(page.getByText(description)).toHaveCount(0);
	} finally {
		await page.goto('/plan');
		const hrefs = await page
			.locator('li.rule', { hasText: description })
			.locator('a.main')
			.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
		for (const href of hrefs)
			await page.request.post(`${href}?/delete`, {
				form: {},
				headers: { origin: baseURL!, accept: 'text/html' }
			});
	}
});

test('USD tab shows the empty state', async ({ page, baseURL }) => {
	await login(page);
	await page.context().addCookies([{ name: 'currency', value: 'USD', url: baseURL! }]);
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(page.getByText('No tenés pagos ni ingresos fijos en dólares.')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Agregar pago fijo' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Agregar ingreso fijo' })).toBeVisible();
});

test('create a rule, register its payment and clean up', async ({ page, baseURL }) => {
	await login(page);
	const description = 'Prueba e2e';
	const post = (href: string) =>
		page.request.post(`${href}?/delete`, {
			form: {},
			headers: { origin: baseURL!, accept: 'text/html' }
		});
	try {
		await page.goto('/plan/recurring/new', { waitUntil: 'networkidle' });
		await page.locator('input[name="description"]').fill(description);
		await page.locator('input[name="amount"]').fill('1.500,50');
		await page.locator('input[name="dayOfMonth"]').fill('15');
		await pick(page, 'Cuenta', 'Mercado Pago');
		await pick(page, 'Categoría', 'Regalos');
		await page.getByRole('button', { name: 'Guardar' }).click();
		await expect(page.getByText('Los montos en pesos van sin decimales.')).toBeVisible();
		await expect(page.locator('input[name="amount"]')).toHaveValue('1.500,50');
		await expect(page).toHaveURL(/\/plan\/recurring\/new$/);

		await page.locator('input[name="amount"]').fill('1.500');
		await page.getByRole('button', { name: 'Guardar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		const row = rule(page, description);
		await expect(row).toBeVisible();
		await expect(row).toContainText('Día 15');

		await row.getByRole('link', { name: /Registrar/ }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Registrar pago' })).toBeVisible();
		await expect(page.locator('input[name="description"]')).toHaveValue(description);
		await expect(page.locator('input[name="amount"]')).toHaveValue('1500');
		await expect(page.locator('input[name="recurringId"]')).toHaveCount(1);
		await expect(page.getByText(`Registrás el pago de ${description} de este mes.`)).toBeVisible();
		await page.getByRole('button', { name: 'Guardar movimiento' }).click();

		await expect(page).toHaveURL(/\/plan\?saved=1$/);
		await expect(page.getByText('Pago registrado.')).toBeVisible();
		await expect(rule(page, description)).toContainText('Pagado');
		await expect(rule(page, description).getByRole('link', { name: /Registrar/ })).toHaveCount(0);
	} finally {
		await page.goto(`/movements?q=${encodeURIComponent(description)}`);
		const movementHrefs = await page
			.locator('a[href*="movements/"]')
			.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
		for (const href of movementHrefs.filter((h) => /\/movements\/[0-9a-f-]{36}$/.test(h)))
			await post(href);
		await page.goto('/plan');
		const ruleHrefs = await rule(page, description)
			.locator('a.main')
			.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
		for (const href of ruleHrefs) await post(href);
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
	const other = await browser.newContext({ baseURL });
	let id: string;
	try {
		const op = await other.newPage();
		await login(op, 'otro@gastar.local');
		await other.addCookies([{ name: 'currency', value: 'USD', url: baseURL! }]);
		await op.goto('/plan', { waitUntil: 'networkidle' });
		id = await op
			.getByRole('link', { name: /Regla ajena/ })
			.first()
			.evaluate((a: HTMLAnchorElement) => a.pathname.split('/').pop()!);
	} finally {
		await other.close();
	}
	await login(page);
	const res = await page.goto(`/plan/recurring/${id}`);
	expect(res!.status()).toBe(404);
	await expect(page.getByText('Movimiento fijo no encontrado.')).toBeVisible();
});
