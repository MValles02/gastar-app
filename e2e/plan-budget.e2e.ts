import { expect, test, type Browser, type Page } from '@playwright/test';
import {
	fillMovement,
	fillSavings,
	findMovements,
	linkId,
	login,
	OTHER_EMAIL,
	pick,
	postDelete,
	setCurrencyCookie,
	todayInAppTz,
	WHOLE_PESOS_ERROR
} from './helpers';

const NOT_OFFERED = 'Elegí una categoría.';

/** The other seeded user's category id and rule id, read from a second logged-in context. */
async function foreignIds(browser: Browser, baseURL: string) {
	const context = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		await login(page, OTHER_EMAIL);
		await page.goto('/categories', { waitUntil: 'networkidle' });
		const category = await linkId(page.getByRole('link', { name: /Ajena/ }));
		await setCurrencyCookie(page, baseURL, 'USD');
		await page.goto('/plan', { waitUntil: 'networkidle' });
		const rule = await linkId(page.getByRole('link', { name: /Regla ajena/ }).first());
		return { category, rule };
	} finally {
		await context.close();
	}
}

/** Posts a form the way a no-JS browser would; never throws on a 4xx. */
const post = (page: Page, baseURL: string, path: string, form: Record<string, string>) =>
	page.request.post(path, { form, headers: { origin: baseURL, accept: 'text/html' } });

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
		hrefs = await findMovements(page, description, o.currency);
	};
	try {
		await fillMovement(page, {
			type: 'Gasto',
			// The 1st of the Buenos Aires month: still this month, but not the newest movement, so specs
			// that open "the first outcome" in parallel never pick (and lose) this transient one.
			date: `${todayInAppTz().slice(0, 8)}01`,
			amount: o.amount,
			description,
			account: o.account,
			category: 'Ajena'
		});
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();
		// Look the movement up now so the delete in `finally` is just a POST: the shorter the movement
		// exists, the less it can disturb specs that compare account totals in parallel.
		await find();
		await fn();
	} finally {
		if (hrefs.length === 0) await find();
		for (const href of hrefs) await postDelete(page, baseURL, href);
	}
}

/** The summary figures of /plan by label, as integer minor-unit magnitudes (ARS has no decimals). */
async function figures(page: Page) {
	// Server-rendered, so no hydration wait: keeps the window in which a transient movement exists short.
	await page.goto('/plan');
	const dl = page.locator('dl.figures');
	const terms = await dl.locator('dt').allInnerTexts();
	const values = await dl.locator('dd').allInnerTexts();
	const out: Record<string, number> = {};
	// Savings, pending fixed payments and spent show a minus; the equation uses their magnitudes.
	terms.forEach((t, i) => (out[t.trim()] = Number(values[i].replace(/\D/g, ''))));
	// Disponible is the hero amount of the summary card (signed).
	const hero = await page
		.getByRole('region', { name: /^Disponible · / })
		.locator('.hero-amount')
		.innerText();
	out['Disponible'] = Number(hero.replace(/\D/g, '')) * (/[-−]/.test(hero) ? -1 : 1);
	return out;
}

/**
 * Re-saves the demo user's seeded ARS plan (scripts/seed.js: savings 150.000, Supermercado limit
 * 300.000) through the plan screens' actions, so a run interrupted mid-test cannot leave a modified
 * plan behind. Logged in as the demo user.
 */
async function restoreDemoPlan(page: Page, baseURL: string) {
	await setCurrencyCookie(page, baseURL, 'ARS');
	await post(page, baseURL, '/plan/savings', {
		savingsOption: 'other',
		savingsUnit: 'amount',
		savingsValue: '150.000'
	});
	await page.goto('/categories', { waitUntil: 'networkidle' });
	const superId = await linkId(page.getByRole('link', { name: /Supermercado/ }).first());
	const edit = await post(page, baseURL, `/plan/limits/${superId}?/save`, { amount: '300.000' });
	if (edit.status() === 404)
		await post(page, baseURL, '/plan/limits/new', { categoryId: superId, amount: '300.000' });
}

/** Deletes every category of the signed-in user named `name` (leftovers of an interrupted run). */
async function deleteCategories(page: Page, baseURL: string, name: string) {
	await page.goto('/categories', { waitUntil: 'networkidle' });
	const paths = await page
		.getByRole('link', { name: new RegExp(name) })
		.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).pathname));
	for (const path of paths) await postDelete(page, baseURL, path);
}

test('ARS decimals are rejected in savings and in limits, and nothing is written', async ({
	page
}) => {
	await login(page);
	await page.goto('/plan/savings', { waitUntil: 'networkidle' });
	await fillSavings(page, { option: 'Otro', unit: '$', value: '1.000,50' });
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText(WHOLE_PESOS_ERROR);
	await expect(page).toHaveURL(/\/plan\/savings$/);

	await page.goto('/categories', { waitUntil: 'networkidle' });
	const superId = await linkId(page.getByRole('link', { name: /Supermercado/ }).first());
	await page.goto(`/plan/limits/${superId}`, { waitUntil: 'networkidle' });
	await page.locator('input[name="amount"]').fill('100,5');
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page.getByRole('alert')).toContainText(WHOLE_PESOS_ERROR);
	await expect(page).toHaveURL(/\/plan\/limits\/[0-9a-f-]{36}/);

	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(page.getByRole('region', { name: 'Límites por categoría' })).toContainText(
		'300.000'
	);
});

test("another user's category and rule never leak or get written", async ({
	page,
	browser,
	baseURL
}) => {
	const { category, rule } = await foreignIds(browser, baseURL!);
	await login(page);
	await setCurrencyCookie(page, baseURL!, 'ARS');

	await page.goto('/plan/limits/new', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: /Categoría/ }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByText('Servicios', { exact: true })).toBeVisible();
	await expect(dialog.getByText('Ajena')).toHaveCount(0);

	const res = await post(page, baseURL!, '/plan/limits/new', { categoryId: category, amount: '5' });
	expect(res.status()).toBe(400);
	expect(await res.text()).toContain(NOT_OFFERED);
	expect((await page.goto(`/plan/limits/${category}`))!.status()).toBe(404);
	expect((await post(page, baseURL!, `/plan/limits/${category}?/delete`, {})).status()).toBe(404);

	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(page.getByText('Ajena')).toHaveCount(0);
	await expect(page.getByText('Regla ajena')).toHaveCount(0);
	expect((await page.goto(`/plan/recurring/${rule}`))!.status()).toBe(404);
	expect((await page.goto(`/plan/recurring/${rule}/edit`))!.status()).toBe(404);
});

test("another user cannot attach a limit to the demo user's category", async ({
	page,
	browser,
	baseURL
}) => {
	await login(page);
	await restoreDemoPlan(page, baseURL!);
	await page.goto('/categories', { waitUntil: 'networkidle' });
	const superId = await linkId(page.getByRole('link', { name: /Supermercado/ }).first());
	const demoBefore = await figures(page);

	const context = await browser.newContext({ baseURL });
	try {
		const other = await context.newPage();
		await login(other, OTHER_EMAIL);
		await setCurrencyCookie(other, baseURL!, 'USD');
		const before = await figures(other);
		const res = await post(other, baseURL!, '/plan/limits/new', {
			categoryId: superId,
			amount: '5'
		});
		expect(res.status()).toBe(400);
		expect(await res.text()).toContain(NOT_OFFERED);
		expect((await other.goto(`/plan/limits/${superId}`))!.status()).toBe(404);
		const after = await figures(other);
		expect(after).toEqual(before);
		await expect(other.getByRole('region', { name: 'Límites por categoría' })).not.toContainText(
			'Supermercado'
		);
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
	await restoreDemoPlan(page, baseURL!);
	const name = 'Límite e2e';
	await deleteCategories(page, baseURL!, name);
	let categoryPath = '';
	try {
		await page.goto('/categories/new', { waitUntil: 'networkidle' });
		await page.getByLabel('Nombre').fill(name);
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/categories\/[0-9a-f-]{36}$/);
		categoryPath = new URL(page.url()).pathname;
		const id = categoryPath.split('/').pop()!;

		await page.goto('/plan/limits/new', { waitUntil: 'networkidle' });
		await pick(page, 'Categoría', name);
		await page.locator('input[name="amount"]').fill('5.000');
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/plan$/);
		const limits = page.getByRole('region', { name: 'Límites por categoría' });
		await expect(limits).toContainText(name);
		await expect(limits).toContainText('5.000');

		await page.goto(categoryPath, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Eliminar' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
		await expect(page).toHaveURL(/\/categories$/);
		categoryPath = '';

		await page.goto('/plan', { waitUntil: 'networkidle' });
		await expect(page.getByText(name)).toHaveCount(0);
		expect((await page.goto(`/plan/limits/${id}`))!.status()).toBe(404);
	} finally {
		if (categoryPath) await postDelete(page, baseURL!, `${baseURL}${categoryPath}`);
	}
});

test('a limit on an archived category is rejected and nothing is written', async ({
	page,
	baseURL
}) => {
	await login(page);
	await restoreDemoPlan(page, baseURL!);
	await page.goto('/categories?archived=1', { waitUntil: 'networkidle' });
	const archived = await linkId(page.getByRole('link', { name: /Gimnasio/ }).first());
	const res = await post(page, baseURL!, '/plan/limits/new', { categoryId: archived, amount: '5' });
	expect(res.status()).toBe(400);
	expect(await res.text()).toContain(NOT_OFFERED);
	await page.goto('/plan', { waitUntil: 'networkidle' });
	const limits = page.getByRole('region', { name: 'Límites por categoría' });
	await expect(limits).toContainText('Supermercado');
	await expect(limits).not.toContainText('Gimnasio');
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('a wizard step is a plain page with link navigation', async ({ page }) => {
		await login(page);
		await page.goto('/plan/setup?step=1');
		await expect(page.getByRole('heading', { name: '¿Cuánto cobrás por mes?' })).toBeVisible();
		await expect(page.getByText('Paso 1 de 5')).toBeVisible();
		await expect(page.getByRole('link', { name: /Sueldo/ })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Siguiente' })).toHaveAttribute(
			'href',
			/\/plan\/setup\?step=2$/
		);
	});
});

test('Disponible = Ingresos - Ahorro - Pagos fijos pendientes - Gastado on one page load', async ({
	page,
	baseURL
}) => {
	await login(page);
	await restoreDemoPlan(page, baseURL!);
	// Specs running in parallel add and remove ARS rules and movements, so nothing here relies on an
	// exact global total: every check is made on the figures of a single page load.
	await expect(async () => {
		const g = await figures(page);
		expect(g['Ingresos']).toBe(1_500_000);
		expect(g['Ahorro']).toBe(150_000);
		expect(g['Disponible']).toBe(
			g['Ingresos'] - g['Ahorro'] - g['Pagos fijos pendientes'] - g['Gastado']
		);
	}).toPass({ timeout: 30_000 });
	await expect(page.locator('.rule', { hasText: 'Alquiler' })).toContainText('380.000');
});

// The tests that create movements run as `otro`: no other spec reads its data, so they cannot
// disturb the demo user's totals (currency.e2e.ts) or Disponible.
test.describe('as another user', () => {
	test.beforeEach(async ({ page, baseURL }) => {
		await login(page, OTHER_EMAIL);
		await setCurrencyCookie(page, baseURL!, 'USD');
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

	test('USD Gastado on Plan equals Gastos on Reportes', async ({ page }) => {
		await expect(async () => {
			const { Gastado } = await figures(page);
			await page.goto('/reports');
			const gastos = page.locator('dl.totals > div').filter({ hasText: 'Gastos' }).locator('dd');
			expect(Number((await gastos.innerText()).replace(/\D/g, ''))).toBe(Gastado);
		}).toPass({ timeout: 30_000 });
	});

	test('paying a fixed payment moves it from Pendientes to Gastado; paying more lowers Disponible', async ({
		page,
		baseURL
	}) => {
		const description = `Pago regla e2e ${Date.now()}`;
		const headers = { origin: baseURL!, accept: 'text/html' };
		await page.goto('/plan', { waitUntil: 'networkidle' });
		const id = await linkId(page.getByRole('link', { name: /Regla ajena/ }).first());
		await page.goto(`/movements/new?recurring=${id}`, { waitUntil: 'networkidle' });
		const accountId = (await page.locator('input[name="accountId"]').getAttribute('value'))!;
		const categoryId = (await page.locator('input[name="categoryId"]').getAttribute('value'))!;
		const pay = async (amount: string) => {
			const res = await page.request.post('/movements/new', {
				form: {
					recurringId: id,
					type: 'outcome',
					amount,
					description,
					accountId,
					categoryId,
					occurredAt: todayInAppTz()
				},
				headers
			});
			expect(res.url()).toMatch(/\/plan\?saved=1$/);
		};
		const remove = async () => {
			for (const href of await findMovements(page, description, 'USD'))
				await postDelete(page, baseURL!, href);
		};
		try {
			const open = await figures(page);
			expect(open['Pagos fijos pendientes']).toBeGreaterThanOrEqual(5000);

			await pay('50,00');
			const exact = await figures(page);
			expect(exact['Disponible']).toBe(open['Disponible']);
			expect(exact['Gastado']).toBe(open['Gastado'] + 5000);
			expect(exact['Pagos fijos pendientes']).toBe(open['Pagos fijos pendientes'] - 5000);

			await remove();
			await pay('70,00');
			const over = await figures(page);
			expect(over['Disponible']).toBe(open['Disponible'] - 2000);
			expect(over['Gastado']).toBe(open['Gastado'] + 7000);
			expect(over['Pagos fijos pendientes']).toBe(open['Pagos fijos pendientes'] - 5000);
		} finally {
			await remove();
		}
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
