import { expect, test, type Cookie, type Page } from '@playwright/test';
import {
	createAccount,
	createVia,
	deleteCategories,
	fillMovement,
	fillSavings,
	findMovements,
	foreignIds,
	limitsRegion,
	linkId,
	login,
	pick,
	post,
	postDelete,
	signUpVerified,
	todayInAppTz,
	gotoHydrated
} from './helpers';

const NOT_OFFERED = 'Elegí una categoría.';

// The figures-delta tests run as this file's own user (1 sign-up, see signUpVerified): no other spec
// writes its data, unlike the seeded `otro`, whose USD movements other files write in parallel.
let cookies: Cookie[] = [];

test.beforeAll(async ({ browser, baseURL }) => {
	test.setTimeout(90_000);
	const context = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		await signUpVerified(page, context.request, {
			email: `e2e+budget-${Date.now()}@gastar.local`,
			password: 'e2e-pass-1234',
			name: 'E2E Presupuesto'
		});
		const create = (path: string, form: Record<string, string>) =>
			createVia(page, baseURL!, path, form);
		const usd = await createAccount(page, baseURL!, 'Otra cuenta', 'USD', '500');
		const ars = await createAccount(page, baseURL!, 'Otra cuenta pesos', 'ARS', '500');
		const category = await create('/categories/new', { name: 'Ajena', color: 'blue', kind: '' });
		await create('/plan/recurring/new', {
			type: 'outcome',
			description: 'Regla ajena',
			amount: '50',
			dayOfMonth: '10',
			accountId: usd,
			categoryId: category
		});
		await create('/plan/recurring/new', {
			type: 'income',
			description: 'Sueldo',
			amount: '200.000',
			dayOfMonth: '1',
			accountId: ars,
			categoryId: category
		});

		// The plan counts USD at the last ARS->USD transfer's rate: 1 USD = $1.000.
		await create('/movements/new', {
			type: 'transfer',
			amount: '100.000',
			description: 'Compra de dólares',
			accountId: ars,
			destinationAccountId: usd,
			exchangeRate: '1.000',
			occurredAt: todayInAppTz()
		});

		// A quick plan through the wizard: no savings, no limits.
		await page.goto('/plan/setup?step=3');
		await fillSavings(page, { option: 'Nada' });
		await page.getByRole('button', { name: 'Siguiente' }).click();
		await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);
		await page.getByRole('link', { name: 'Siguiente' }).click();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Plan guardado.')).toBeVisible();
		cookies = await context.cookies();
	} finally {
		await context.close();
	}
});

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
	terms.forEach(
		(t, i) => (out[t.replace(/\s*›$/, '').trim()] = Number(values[i].replace(/\D/g, '')))
	);
	// Disponible is the hero amount of the summary card (signed).
	const hero = await page
		.getByRole('region', { name: /^Disponible$/ })
		.locator('.hero-amount')
		.innerText();
	out['Disponible'] = Number(hero.replace(/\D/g, '')) * (/[-−]/.test(hero) ? -1 : 1);
	return out;
}

/** The limit edit links on /plan, i.e. which categories have a limit. */
async function limitHrefs(page: Page) {
	await page.goto('/plan');
	return limitsRegion(page)
		.locator('a[href^="/plan/limits/"]:not([href$="/new"])')
		.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).pathname).sort());
}

/**
 * Re-saves the demo user's seeded ARS plan (scripts/seed.js: savings 150.000, Supermercado limit
 * 300.000) through the plan screens' actions, so a run interrupted mid-test cannot leave a modified
 * plan behind. Logged in as the demo user.
 */
async function restoreDemoPlan(page: Page, baseURL: string) {
	await post(page, baseURL, '/plan/savings?/update', {
		savingsOption: 'other',
		savingsUnit: 'amount',
		savingsValue: '150.000'
	});
	await page.goto('/categories');
	const superId = await linkId(page.getByRole('link', { name: /Supermercado/ }).first());
	const edit = await post(page, baseURL, `/plan/limits/${superId}?/update`, { amount: '300.000' });
	if (edit.status() === 404)
		await post(page, baseURL, '/plan/limits/new', {
			categoryId: superId,
			amount: '300.000',
			currency: 'ARS'
		});
}

/** The Supermercado limit's meter on /plan; its value text carries "<spent> de <limit>". */
const superMeter = (page: Page) =>
	limitsRegion(page).getByRole('meter', { name: 'Límite de Supermercado' });

test("another user's category and rule never leak or get written", async ({
	page,
	browser,
	baseURL
}) => {
	const { category } = await foreignIds(browser, baseURL!);
	await login(page);

	await gotoHydrated(page, '/plan/limits/new');
	await page.getByRole('button', { name: /Categoría/ }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByText('Servicios', { exact: true })).toBeVisible();
	await expect(dialog.getByText('Ajena')).toHaveCount(0);

	const res = await post(page, baseURL!, '/plan/limits/new', {
		categoryId: category,
		amount: '5',
		currency: 'ARS'
	});
	expect(res.status()).toBe(400);
	expect(await res.text()).toContain(NOT_OFFERED);
	expect((await page.goto(`/plan/limits/${category}`))!.status()).toBe(404);
	expect((await post(page, baseURL!, `/plan/limits/${category}?/delete`, {})).status()).toBe(404);

	await page.goto('/plan');
	await expect(page.getByText('Ajena')).toHaveCount(0);
	await expect(page.getByText('Regla ajena')).toHaveCount(0);

	// The other direction: another user cannot attach a limit to the demo user's category.
	await page.goto('/categories');
	const superId = await linkId(page.getByRole('link', { name: /Supermercado/ }).first());
	const context = await browser.newContext({ baseURL });
	try {
		const other = await context.newPage();
		await context.addCookies(cookies);
		const before = await limitHrefs(other);
		const attach = await post(other, baseURL!, '/plan/limits/new', {
			categoryId: superId,
			amount: '5',
			currency: 'ARS'
		});
		expect(attach.status()).toBe(400);
		expect(await attach.text()).toContain(NOT_OFFERED);
		expect((await other.goto(`/plan/limits/${superId}`))!.status()).toBe(404);
		expect(await limitHrefs(other)).toEqual(before);
		await expect(limitsRegion(other)).not.toContainText('Supermercado');
	} finally {
		await context.close();
	}
});

test('deleting a category removes its limit', async ({ page, baseURL }) => {
	await login(page);
	await restoreDemoPlan(page, baseURL!);
	const name = 'Límite e2e';
	await deleteCategories(page, baseURL!, name);
	let categoryPath = '';
	try {
		await page.goto('/categories/new');
		await page.getByLabel('Nombre').fill(name);
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/categories\/[0-9a-f-]{36}$/);
		categoryPath = new URL(page.url()).pathname;
		const id = categoryPath.split('/').pop()!;

		await page.goto('/plan/limits/new');
		await pick(page, 'Categoría', name);
		await page.locator('input[name="amount"]').fill('5.000');
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/plan$/);
		const limits = limitsRegion(page);
		await expect(limits).toContainText(name);
		await expect(limits.getByRole('meter', { name: `Límite de ${name}` })).toHaveAttribute(
			'aria-valuetext',
			/de \$\s?5\.000$/
		);

		await page.goto(categoryPath);
		await page.getByRole('button', { name: 'Eliminar' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
		await expect(page).toHaveURL(/\/categories$/);
		categoryPath = '';

		await page.goto('/plan');
		await expect(page.getByText(name)).toHaveCount(0);
		expect((await page.goto(`/plan/limits/${id}`))!.status()).toBe(404);
	} finally {
		if (categoryPath) await postDelete(page, baseURL!, `${baseURL}${categoryPath}`);
	}
});

test('a limit amount edited in its drawer persists', async ({ page, baseURL }) => {
	await login(page);
	await restoreDemoPlan(page, baseURL!);
	try {
		await gotoHydrated(page, '/plan');
		await limitsRegion(page)
			.getByRole('link', { name: /Supermercado/ })
			.click();
		const drawer = page.getByRole('dialog', { name: 'Límite de Supermercado' });
		await drawer.getByRole('button', { name: /^Monto del límite/ }).click();
		await drawer.getByLabel('Monto del límite').fill('310.000');
		await drawer.getByLabel('Monto del límite').press('Enter');
		await expect(drawer.getByRole('button', { name: 'Monto del límite: 310.000' })).toBeVisible();
		await page.goto('/plan');
		await expect(superMeter(page)).toHaveAttribute('aria-valuetext', /de \$\s?310\.000$/);
	} finally {
		await restoreDemoPlan(page, baseURL!);
	}
});

test.describe('as another user', () => {
	test.beforeEach(async ({ page }) => {
		await page.context().addCookies(cookies);
	});

	test('the plan counts USD in pesos at the last purchase rate; a manual rate overrides it', async ({
		page,
		baseURL
	}) => {
		const ruleRow = page.locator('.rule', { hasText: 'Regla ajena' });
		try {
			await page.goto('/plan');
			await expect(ruleRow).toContainText('≈ $50.000');

			const before = await figures(page);
			await withOutcome(
				page,
				baseURL!,
				{ amount: '10,00', account: 'Otra cuenta', currency: 'USD' },
				async () => {
					const after = await figures(page);
					expect(after['Disponible']).toBe(before['Disponible'] - 10_000);
					expect(after['Gastado']).toBe(before['Gastado'] + 10_000);
				}
			);

			await gotoHydrated(page, '/plan');
			await page.getByRole('link', { name: /^Cotización:/ }).click();
			const drawer = page.getByRole('dialog', { name: 'Cotización del plan' });
			await drawer.getByLabel('Monto').fill('1.200');
			await drawer.getByRole('button', { name: 'Guardar', exact: true }).click();
			await expect(ruleRow).toContainText('≈ $60.000');

			await page.getByRole('link', { name: /^Cotización:/ }).click();
			await page
				.getByRole('dialog', { name: 'Cotización del plan' })
				.getByRole('button', { name: 'Usar la última compra' })
				.click();
			await expect(ruleRow).toContainText('≈ $50.000');
		} finally {
			await post(page, baseURL!, '/plan/rate?/auto', {});
		}
	});

	test('paying a fixed payment moves it from Pendientes to Gastado; paying more lowers Disponible', async ({
		page,
		baseURL
	}) => {
		// The payment links itself to the rule by description (rule amount 50,00 follows a higher charge).
		const description = 'Regla ajena';
		await page.goto('/plan');
		const id = await linkId(page.getByRole('link', { name: /Regla ajena/ }).first());
		await page.goto(`/plan/recurring/${id}`);
		const accountId = (await page
			.locator('input[name="accountId"]:is(:checked, [type="hidden"])')
			.getAttribute('value'))!;
		const categoryId = (await page
			.locator('input[name="categoryId"]:is(:checked, [type="hidden"])')
			.getAttribute('value'))!;
		const pay = async (amount: string) => {
			const res = await post(page, baseURL!, '/movements/new', {
				type: 'outcome',
				amount,
				description,
				accountId,
				categoryId,
				occurredAt: todayInAppTz()
			});
			expect(res.ok()).toBe(true);
		};
		const remove = async () => {
			for (const href of await findMovements(page, description, 'USD'))
				await postDelete(page, baseURL!, href);
		};
		try {
			const open = await figures(page);
			expect(open['Pagos fijos']).toBeGreaterThanOrEqual(50_000);

			await pay('50,00');
			const exact = await figures(page);
			expect(exact['Disponible']).toBe(open['Disponible']);
			expect(exact['Gastado']).toBe(open['Gastado'] + 50_000);
			expect(exact['Pagos fijos']).toBe(open['Pagos fijos'] - 50_000);

			await remove();
			await pay('70,00');
			const over = await figures(page);
			expect(over['Disponible']).toBe(open['Disponible'] - 20_000);
			expect(over['Gastado']).toBe(open['Gastado'] + 70_000);
			expect(over['Pagos fijos']).toBe(open['Pagos fijos'] - 50_000);
		} finally {
			await remove();
			// A higher charge moved the rule's amount: put it back.
			await post(page, baseURL!, `/plan/recurring/${id}?/update`, { amount: '50' });
		}
	});
});
