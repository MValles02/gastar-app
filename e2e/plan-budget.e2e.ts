import { expect, test, type Browser, type Page } from '@playwright/test';

// Same defaults as scripts/seed.js (local demo users, not secrets).
const email = process.env.SEED_EMAIL || 'demo@gastar.local';
const password = process.env.SEED_PASSWORD || 'demo1234';
const otherEmail = 'otro@gastar.local';

async function login(page: Page, as = email) {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByLabel('Email').fill(as);
	await page.getByLabel('Contraseña').fill(password);
	await page.getByRole('button', { name: 'Ingresar' }).click();
	await expect(page).toHaveURL(/\/$/);
}

const setCurrency = (page: Page, value: 'ARS' | 'USD', baseURL: string) =>
	page.context().addCookies([{ name: 'currency', value, url: baseURL }]);

const post = (page: Page, baseURL: string, href: string) =>
	page.request.post(`${href}?/delete`, {
		form: {},
		headers: { origin: baseURL, accept: 'text/html' }
	});

/** The other seeded user's category id and rule id, read from a second logged-in context. */
async function foreignIds(browser: Browser, baseURL: string) {
	const context = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		await login(page, otherEmail);
		await page.goto('/categories', { waitUntil: 'networkidle' });
		const category = await page
			.getByRole('link', { name: /Ajena/ })
			.evaluate((a: HTMLAnchorElement) => a.pathname.split('/').pop()!);
		await setCurrency(page, 'USD', baseURL);
		await page.goto('/plan', { waitUntil: 'networkidle' });
		const rule = await page
			.getByRole('link', { name: /Regla ajena/ })
			.first()
			.evaluate((a: HTMLAnchorElement) => a.pathname.split('/').pop()!);
		return { category, rule };
	} finally {
		await context.close();
	}
}

const step = (page: Page, n: number) => page.locator('section.step').nth(n - 1);
async function toStep(page: Page, n: number) {
	for (let i = 1; i < n; i++) await page.getByRole('button', { name: 'Siguiente' }).click();
}
const savePlan = (page: Page) => page.getByRole('button', { name: 'Guardar plan' }).click();

async function openSetup(page: Page) {
	await page.goto('/plan/setup', { waitUntil: 'networkidle' });
	// Wait for hydration: the JS-only stepper appears once mounted.
	await expect(page.getByRole('list', { name: 'Pasos' })).toBeVisible();
}

/** Appends a hidden limit input for a category the user does not own (a crafted request). */
const injectLimit = (page: Page, categoryId: string) =>
	page.locator('form.wizard').evaluate((form, id) => {
		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = `limit_${id}`;
		input.value = '5';
		form.appendChild(input);
	}, categoryId);

const pick = async (page: Page, legend: string, name: string) => {
	await page.getByRole('button', { name: new RegExp(legend) }).click();
	await page.getByRole('dialog').getByText(name, { exact: true }).click();
};

/** Creates an outcome through the form, runs `fn`, and always deletes the movement afterwards. */
async function withOutcome(
	page: Page,
	baseURL: string,
	o: { amount: string; account: string; currency: 'ARS' | 'USD' },
	fn: () => Promise<void>
) {
	const description = `Plan e2e ${Date.now()}`;
	let hrefs: string[] = [];
	const find = async () => {
		await page.goto(`/movements?q=${encodeURIComponent(description)}&currency=${o.currency}`);
		hrefs = (
			await page
				.locator('a[href*="movements/"]')
				.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href))
		).filter((h) => /\/movements\/[0-9a-f-]{36}$/.test(h));
	};
	try {
		await page.goto('/movements/new', { waitUntil: 'networkidle' });
		await page.getByRole('radio', { name: 'Gasto' }).check({ force: true });
		// The 1st of the Buenos Aires month: still this month, but not the newest movement, so specs
		// that open "the first outcome" in parallel never pick (and lose) this transient one.
		const first = new Date().toLocaleDateString('en-CA', {
			timeZone: 'America/Argentina/Buenos_Aires'
		});
		await page.locator('input[name="occurredAt"]').fill(`${first.slice(0, 8)}01`);
		await page.locator('input[name="amount"]').fill(o.amount);
		await page.locator('input[name="description"]').fill(description);
		await pick(page, 'Cuenta', o.account);
		await pick(page, 'Categoría', 'Ajena');
		await page.getByRole('button', { name: 'Guardar movimiento' }).click();
		await expect(page).toHaveURL(/saved=1/);
		// Look the movement up now so the delete in `finally` is just a POST: the shorter the movement
		// exists, the less it can disturb specs that compare account totals in parallel.
		await find();
		await fn();
	} finally {
		if (hrefs.length === 0) await find();
		for (const href of hrefs) await post(page, baseURL, href);
	}
}

/** The summary figures of /plan by label, as integer cents-free numbers (ARS has no decimals). */
async function figures(page: Page) {
	// Server-rendered, so no hydration wait: keeps the window in which a transient movement exists short.
	await page.goto('/plan');
	const dl = page.locator('dl.figures');
	const terms = await dl.locator('dt').allInnerTexts();
	const values = await dl.locator('dd').allInnerTexts();
	const out: Record<string, number> = {};
	terms.forEach((t, i) => {
		const v = values[i];
		// Fixed payments, savings and spent show a minus; the equation uses their magnitudes.
		const signed = ['Disponible', 'Para gastar'].includes(t.trim());
		out[t.trim()] = Number(v.replace(/\D/g, '')) * (signed && /[-−]/.test(v) ? -1 : 1);
	});
	// Same page load: the amounts of the active "Pagos fijos" rule rows, which Pagos fijos must equal.
	const rows = await page
		.getByRole('region', { name: 'Pagos fijos' })
		.locator('li.rule .amount-col')
		.allInnerTexts();
	out['Reglas'] = rows.reduce((a, v) => a + Number(v.replace(/\D/g, '')), 0);
	return out;
}

/** Deletes the demo user's USD plan (the demo has none in the seed). */
async function dropUsdPlan(page: Page, baseURL: string) {
	await setCurrency(page, 'USD', baseURL);
	await page.request.post(`${baseURL}/plan/setup?/delete`, {
		form: {},
		headers: { origin: baseURL, accept: 'text/html' }
	});
}

test('a rejected save writes nothing: the plan, its limits and new rules roll back together', async ({
	page,
	browser,
	baseURL
}) => {
	const { category } = await foreignIds(browser, baseURL!);
	await login(page);
	await setCurrency(page, 'USD', baseURL!);
	try {
		await openSetup(page);

		await toStep(page, 2);
		const row = step(page, 2).locator('fieldset.new-row');
		await row.getByLabel('Descripción').fill('Atómico e2e');
		await row.getByLabel('Monto', { exact: true }).fill('10,00');
		await row.getByLabel('Día').fill('5');
		await row.getByLabel('Cuenta').selectOption({ label: 'Ahorro USD' });
		await row.getByLabel('Categoría').selectOption({ label: 'Salud' });
		await injectLimit(page, category);
		await toStep(page, 3);
		await savePlan(page);

		await expect(page.getByRole('alert')).toHaveText(
			'Elegí una categoría válida para cada límite.'
		);
		await page.goto('/plan', { waitUntil: 'networkidle' });
		await expect(page.getByText('Todavía no tenés un plan en dólares.')).toBeVisible();
		await expect(page.getByText('Atómico e2e')).toHaveCount(0);
	} finally {
		await dropUsdPlan(page, baseURL!);
	}
});

test('ARS decimals are rejected in extra income and in limits', async ({ page }) => {
	await login(page);
	await openSetup(page);
	await step(page, 1).getByLabel('Otros ingresos del mes (opcional)').fill('1.000,50');
	await toStep(page, 4);
	await savePlan(page);
	await expect(page.getByRole('alert')).toContainText('Otros ingresos');
	await expect(page.getByRole('alert')).toContainText('Los montos en pesos van sin decimales.');
	await expect(page).toHaveURL(/\/plan\/setup$/);

	await openSetup(page);
	await toStep(page, 4);
	await step(page, 4).getByLabel('Supermercado').fill('100,5');
	await savePlan(page);
	await expect(page.getByRole('alert')).toContainText('límite de Supermercado');
	await expect(page.getByRole('alert')).toContainText('Los montos en pesos van sin decimales.');
	await expect(page).toHaveURL(/\/plan\/setup$/);
});

test("another user's category, plan and rule never leak or get written", async ({
	page,
	browser,
	baseURL
}) => {
	const { category, rule } = await foreignIds(browser, baseURL!);
	await login(page);

	for (const currency of ['ARS', 'USD'] as const) {
		await setCurrency(page, currency, baseURL!);
		await openSetup(page);
		await expect(page.getByText('Ajena')).toHaveCount(0);
		await expect(page.locator(`input[name="limit_${category}"]`)).toHaveCount(0);
	}

	await setCurrency(page, 'USD', baseURL!);
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(page.getByText('Todavía no tenés un plan en dólares.')).toBeVisible();
	await expect(page.getByText('Regla ajena')).toHaveCount(0);

	try {
		await openSetup(page);
		await injectLimit(page, category);
		await toStep(page, 4);
		await savePlan(page);
		await expect(page.getByRole('alert')).toHaveText(
			'Elegí una categoría válida para cada límite.'
		);
		await page.goto('/plan', { waitUntil: 'networkidle' });
		await expect(page.getByText('Todavía no tenés un plan en dólares.')).toBeVisible();
	} finally {
		await dropUsdPlan(page, baseURL!);
	}

	const res = await page.goto(`/plan/recurring/${rule}`);
	expect(res!.status()).toBe(404);
});

test("another user cannot attach a limit to the demo user's category", async ({
	page,
	browser,
	baseURL
}) => {
	await login(page);
	await page.goto('/categories', { waitUntil: 'networkidle' });
	const superId = await page
		.getByRole('link', { name: /Supermercado/ })
		.first()
		.evaluate((a: HTMLAnchorElement) => a.pathname.split('/').pop()!);
	const demoBefore = await figures(page);

	const context = await browser.newContext({ baseURL });
	try {
		const other = await context.newPage();
		await login(other, otherEmail);
		await setCurrency(other, 'USD', baseURL!);
		const before = await figures(other);
		await openSetup(other);
		await injectLimit(other, superId);
		await toStep(other, 4);
		await savePlan(other);
		await expect(other.getByRole('alert')).toHaveText(
			'Elegí una categoría válida para cada límite.'
		);
		const after = await figures(other);
		expect(after).toEqual(before);
		await expect(other.getByRole('region', { name: 'Límites por categoría' })).toHaveCount(0);
	} finally {
		await context.close();
	}

	// The demo plan is untouched: same limit, same income and savings.
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(page.getByRole('region', { name: 'Límites por categoría' })).toContainText(
		'300.000'
	);
	const demoAfter = await figures(page);
	expect(demoAfter['Ingresos']).toBe(demoBefore['Ingresos']);
	expect(demoAfter['Ahorro']).toBe(demoBefore['Ahorro']);
});

test('deleting a category removes its limit', async ({ page, baseURL }) => {
	await login(page);
	const name = 'Límite e2e';
	let categoryPath = '';
	try {
		await page.goto('/categories/new', { waitUntil: 'networkidle' });
		await page.getByLabel('Nombre').fill(name);
		await page.getByRole('button', { name: 'Crear categoría' }).click();
		await expect(page).toHaveURL(/\/categories\/[0-9a-f-]{36}$/);
		categoryPath = new URL(page.url()).pathname;
		const id = categoryPath.split('/').pop()!;

		// Saving also re-saves the demo plan as loaded (same income, savings, limits, month NULL).
		await openSetup(page);
		await toStep(page, 4);
		await page.locator(`input[name="limit_${id}"]`).fill('5.000');
		await savePlan(page);
		await expect(page).toHaveURL(/\/plan\?planSaved=1$/);
		const limits = page.getByRole('region', { name: 'Límites por categoría' });
		await expect(limits).toContainText(name);
		await expect(limits).toContainText('5.000');

		await page.goto(categoryPath, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Eliminar' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
		await expect(page).toHaveURL(/\/categories$/);
		categoryPath = '';

		await page.goto('/plan', { waitUntil: 'networkidle' });
		await expect(page.getByText(name)).toHaveCount(0);
		await openSetup(page);
		await expect(page.locator(`input[name="limit_${id}"]`)).toHaveCount(0);
	} finally {
		if (categoryPath) await post(page, baseURL!, `${baseURL}${categoryPath}`);
	}
});

test('a rule created after the wizard loaded stays active when the plan is saved', async ({
	page,
	baseURL
}) => {
	await login(page);
	const description = 'Tardía e2e';
	try {
		await openSetup(page);

		// Another tab creates a rule while this wizard is open.
		const tab = await page.context().newPage();
		await tab.goto('/plan/recurring/new', { waitUntil: 'networkidle' });
		await tab.locator('input[name="description"]').fill(description);
		await tab.locator('input[name="amount"]').fill('900');
		await tab.locator('input[name="dayOfMonth"]').fill('21');
		await pick(tab, 'Cuenta', 'Mercado Pago');
		await pick(tab, 'Categoría', 'Regalos');
		await tab.getByRole('button', { name: 'Guardar' }).click();
		await expect(tab).toHaveURL(/\/plan$/);
		await tab.close();

		// Saving re-saves the demo plan as loaded (it never showed the new rule).
		await toStep(page, 4);
		await savePlan(page);
		await expect(page).toHaveURL(/\/plan\?planSaved=1$/);
		await expect(page.locator('li.rule', { hasText: description })).toBeVisible();
		await expect(page.getByRole('region', { name: 'Inactivos' })).not.toContainText(description);
	} finally {
		await page.goto('/plan');
		const hrefs = await page
			.locator('li.rule', { hasText: description })
			.locator('a.row')
			.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
		for (const href of hrefs) await post(page, baseURL!, href);
	}
});

test('saving a USD plan shows the toast, accepts cents, and deleting it removes the plan', async ({
	page,
	baseURL
}) => {
	await login(page);
	await setCurrency(page, 'USD', baseURL!);
	try {
		await openSetup(page);
		await step(page, 1).getByLabel('Otros ingresos del mes (opcional)').fill('10,50');
		await toStep(page, 4);
		await savePlan(page);
		await expect(page).toHaveURL(/\/plan\?planSaved=1$/);
		await expect(page.getByText('Plan guardado.')).toBeVisible();
		await expect(
			page.locator('dl.figures dt', { hasText: 'Ingresos' }).locator('+ dd')
		).toContainText('10,50');

		await openSetup(page);
		await page.getByRole('button', { name: 'Eliminar plan' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(page.getByText('Todavía no tenés un plan en dólares.')).toBeVisible();
	} finally {
		await dropUsdPlan(page, baseURL!);
	}
});

test('invalid savings are rejected with a message', async ({ page }) => {
	await login(page);
	for (const value of ['-5', 'abc']) {
		await openSetup(page);
		await toStep(page, 3);
		await step(page, 3).getByLabel('Monto a ahorrar').fill(value);
		await page.getByRole('button', { name: 'Siguiente' }).click();
		await savePlan(page);
		await expect(page.getByRole('alert')).toHaveText('Ingresá un monto de ahorro válido.');
		await expect(page).toHaveURL(/\/plan\/setup$/);
	}
});

test('a limit on an archived category is rejected and nothing is written', async ({ page }) => {
	await login(page);
	await page.goto('/categories?archived=1', { waitUntil: 'networkidle' });
	const archived = await page
		.getByRole('link', { name: /Gimnasio/ })
		.first()
		.evaluate((a: HTMLAnchorElement) => a.pathname.split('/').pop()!);
	await openSetup(page);
	await injectLimit(page, archived);
	await toStep(page, 4);
	await savePlan(page);
	await expect(page.getByRole('alert')).toHaveText('Elegí una categoría válida para cada límite.');
	await page.goto('/plan', { waitUntil: 'networkidle' });
	const limits = page.getByRole('region', { name: 'Límites por categoría' });
	await expect(limits).toContainText('Supermercado');
	await expect(limits).not.toContainText('Gimnasio');
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the wizard shows every step and one save button', async ({ page }) => {
		await login(page);
		await page.goto('/plan/setup');
		for (const h of [
			'¿Cuánto cobrás por mes en ARS?',
			'¿Qué pagos fijos tenés?',
			'¿Cuánto querés ahorrar?'
		])
			await expect(page.getByRole('heading', { name: h })).toBeVisible();
		await expect(page.getByRole('heading', { name: /^Tu plan para/ })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Guardar plan' })).toHaveCount(1);
		await expect(page.getByRole('button', { name: 'Siguiente' })).toHaveCount(0);
	});
});

test('Disponible = Ingresos - Pagos fijos - Ahorro - Gastado on one page load', async ({
	page
}) => {
	await login(page);
	// Specs running in parallel add and remove ARS rules and movements, so nothing here relies on an
	// exact global total: every check is made on the figures of a single page load.
	await expect(async () => {
		const g = await figures(page);
		expect(g['Ingresos']).toBe(1_500_000);
		expect(g['Ahorro']).toBe(150_000);
		expect(g['Pagos fijos']).toBeGreaterThanOrEqual(380_000);
		expect(g['Pagos fijos']).toBe(g['Reglas']);
		expect(g['Disponible']).toBe(g['Ingresos'] - g['Pagos fijos'] - g['Ahorro'] - g['Gastado']);
	}).toPass({ timeout: 30_000 });
	await expect(page.locator('li.rule', { hasText: 'Alquiler' })).toContainText('380.000');
});

// The tests that create movements run as `otro`: no other spec reads its data, so they cannot
// disturb the demo user's totals (currency.e2e.ts) or Disponible.
test.describe('as another user', () => {
	test.beforeEach(async ({ page, baseURL }) => {
		await login(page, otherEmail);
		await setCurrency(page, 'USD', baseURL!);
	});

	test('a USD outcome lowers the USD Disponible by exactly that amount', async ({
		page,
		baseURL
	}) => {
		const before = await figures(page);
		await withOutcome(
			page,
			baseURL!,
			{ amount: '10,00', account: 'Otra cuenta', currency: 'USD' },
			async () => {
				const after = await figures(page);
				expect(after['Disponible']).toBe(before['Disponible'] - 1000);
				expect(after['Gastado']).toBe(before['Gastado'] + 1000);
			}
		);
	});

	test('an ARS outcome does not change the USD Disponible', async ({ page, baseURL }) => {
		const before = await figures(page);
		await withOutcome(
			page,
			baseURL!,
			{ amount: '5.000', account: 'Otra cuenta pesos', currency: 'ARS' },
			async () => {
				const after = await figures(page);
				expect(after['Disponible']).toBe(before['Disponible']);
				expect(after['Gastado']).toBe(before['Gastado']);
			}
		);
	});
});
