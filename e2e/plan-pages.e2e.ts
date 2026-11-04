import { expect, test, type Browser, type Cookie, type Page } from '@playwright/test';
import {
	deleteMovements,
	deleteRules,
	fillSavings,
	linkId,
	login,
	OTHER_EMAIL,
	pick,
	pickDay,
	postDelete,
	setCurrencyCookie,
	todayInAppTz,
	WHOLE_PESOS_ERROR
} from './helpers';
import { waitForLink } from './outbox';

// Everything runs as one freshly signed-up user, so no other spec (and no demo-user month total) is
// disturbed. Tests are serial: each leaves the plan the next one expects (see the order below).
test.describe.configure({ mode: 'serial', timeout: 90_000 });

const password = 'e2e-pass-1234';
const ids = { account: '', food: '', gym: '', salary: '' };
let cookies: Cookie[] = [];

/** The 15th of the previous month (inside the 3 full months the limit suggestions average). */
function lastMonth15() {
	const [y, m] = todayInAppTz().split('-').map(Number);
	return new Date(Date.UTC(y, m - 2, 15)).toISOString().slice(0, 10);
}

test.beforeAll(async ({ browser, baseURL }) => {
	const context = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		const email = `e2e+plan-${Date.now()}@gastar.local`;
		await page.goto('/signup', { waitUntil: 'networkidle' });
		await page.getByLabel('Nombre').fill('E2E Plan');
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Contraseña', { exact: true }).fill(password);
		await page.getByRole('button', { name: 'Crear cuenta' }).click();
		await expect(page.getByRole('heading', { name: 'Revisá tu email' })).toBeVisible();
		await page.goto((await waitForLink(context.request, email, /Confirmá/)).link);
		await expect(page).toHaveURL(/\/$/);

		const headers = { origin: baseURL!, accept: 'text/html' };
		// Each create redirects to the new entity's page: its id is the last path segment.
		const create = async (path: string, form: Record<string, string>) => {
			const res = await page.request.post(path, { form, headers });
			expect(res.ok()).toBe(true);
			return res.url().split('/').pop()!;
		};
		ids.account = await create('/accounts/new', {
			name: 'Caja e2e',
			currency: 'ARS',
			initialBalance: '0',
			icon: 'bank',
			color: 'green'
		});
		await create('/accounts/new', {
			name: 'Dólares e2e',
			currency: 'USD',
			initialBalance: '0',
			icon: 'bank',
			color: 'blue'
		});
		ids.food = await create('/categories/new', {
			name: 'Comida e2e',
			color: 'green',
			kind: 'outcome'
		});
		ids.gym = await create('/categories/new', { name: 'Gym e2e', color: 'blue', kind: 'outcome' });
		ids.salary = await create('/categories/new', {
			name: 'Cobro e2e',
			color: 'teal',
			kind: 'income'
		});
		// Last month's spending gives Comida a suggested limit (30.000 over 3 months = 10.000).
		await create('/movements/new', {
			type: 'outcome',
			amount: '30000',
			description: 'Super previo e2e',
			accountId: ids.account,
			categoryId: ids.food,
			occurredAt: lastMonth15()
		});
		cookies = await context.cookies();
	} finally {
		await context.close();
	}
});

test.beforeEach(async ({ page }) => {
	await page.context().addCookies(cookies);
});

/** A row of the Disponible card by its label. */
const kv = (page: Page, label: string) => page.locator('.kv', { hasText: label });
const available = (page: Page) =>
	page.getByRole('region', { name: /^Disponible · / }).locator('.hero-amount');
const limits = (page: Page) => page.getByRole('region', { name: 'Límites por categoría' });
const savePlan = (page: Page) => page.getByRole('button', { name: 'Guardar', exact: true });

/** The id of another user's category, for the 404 checks. */
async function foreignCategory(browser: Browser, baseURL: string) {
	const context = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		await login(page, OTHER_EMAIL);
		await page.goto('/categories', { waitUntil: 'networkidle' });
		return await linkId(page.getByRole('link', { name: /Ajena/ }));
	} finally {
		await context.close();
	}
}

test('the wizard creates a plan in five steps, returning from the add screens', async ({
	page
}) => {
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(page.getByText('Sin plan en pesos')).toBeVisible();
	await page.getByRole('link', { name: 'Crear plan' }).click();
	await expect(page).toHaveURL(/\/plan\/setup$/);
	await expect(page.getByText('Paso 1 de 5')).toBeVisible();
	await expect(page.getByText('Detectamos que se repiten')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Eliminar plan' })).toHaveCount(0);

	// 1. Ingresos: + Agregar opens the income drawer without leaving the step.
	await page.getByRole('link', { name: '+ Agregar' }).click();
	const drawer = page.getByRole('dialog', { name: 'Nuevo ingreso fijo' });
	await expect(drawer).toBeVisible();
	await drawer.locator('input[name="description"]').fill('Sueldo e2e');
	await drawer.locator('input[name="amount"]').fill('1.000.000');
	await pickDay(page, '5');
	await pick(page, 'Cuenta', 'Caja e2e');
	await pick(page, 'Categoría', 'Cobro e2e');
	await drawer.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(drawer).toBeHidden();
	await expect(page).toHaveURL(/\/plan\/setup(\?step=1)?$/);
	await expect(page.getByRole('link', { name: /Sueldo e2e/ })).toBeVisible();

	// 2. Pagos fijos: none.
	await page.getByRole('link', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/\/plan\/setup\?step=2$/);
	await expect(page.getByText('Sin pagos fijos.')).toBeVisible();
	await page.getByRole('link', { name: 'Siguiente' }).click();

	// 3. Ahorro: submitting creates the plan.
	await expect(page).toHaveURL(/\/plan\/setup\?step=3$/);
	await fillSavings(page, { option: '10%' });
	await page.getByRole('button', { name: 'Siguiente' }).click();

	// 4. Límites: the suggested ones, then one added by hand in the drawer.
	await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);
	await expect(page.getByText('Sin límites.')).toBeVisible();
	await page.getByRole('button', { name: 'Usar sugeridos' }).click();
	await expect(page.getByRole('link', { name: /Comida e2e/ })).toBeVisible();
	await page.getByRole('link', { name: '+ Agregar' }).click();
	const limitDrawer = page.getByRole('dialog', { name: 'Nuevo límite' });
	await pick(page, 'Categoría', 'Gym e2e');
	await limitDrawer.locator('input[name="amount"]').fill('5.000');
	await limitDrawer.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(limitDrawer).toBeHidden();
	await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);
	await expect(page.getByRole('link', { name: /Gym e2e/ })).toBeVisible();
	await expect(page.getByRole('link', { name: /Comida e2e/ })).toBeVisible();

	// 5. Resumen.
	await page.getByRole('link', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/\/plan\/setup\?step=5$/);
	const summary = page.locator('dl.figures');
	await expect(summary).toContainText('1.000.000');
	await expect(summary).toContainText('100.000');
	await expect(summary).toContainText('900.000');
	await expect(summary).toContainText('Comida e2e');
	await expect(summary).toContainText('Gym e2e');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/plan$/);
	await expect(page.getByText('Plan guardado.')).toBeVisible();
	await expect(page.getByRole('region', { name: /^Disponible · / })).toBeVisible();
});

test('/plan/setup goes back to /plan once a plan exists', async ({ page }) => {
	for (const url of ['/plan/setup', '/plan/setup?step=9']) {
		await page.goto(url);
		await expect(page).toHaveURL(/\/plan$/);
	}
	// A numbered step stays reachable (the wizard links to it).
	await page.goto('/plan/setup?step=4');
	await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);
});

test('10 % savings follows an income change, Otro validates and saves both', async ({
	page,
	baseURL
}) => {
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(kv(page, 'Ingresos')).toContainText('1.000.000');
	await expect(kv(page, 'Ahorro')).toContainText('100.000');
	await expect(available(page)).toContainText('900.000');

	// The Ahorro drawer opens over the plan; 10 % is the pick.
	await page.getByRole('link', { name: 'Ahorro', exact: true }).click();
	await expect(page).toHaveURL(/\/plan$/);
	await expect(page.getByRole('button', { name: /^10 %/ })).toHaveAttribute('aria-pressed', 'true');

	// Raise the income through the rule's update action.
	await page.goto('/plan', { waitUntil: 'networkidle' });
	const id = await linkId(page.getByRole('link', { name: /Sueldo e2e/ }));
	const res = await page.request.post(`/plan/recurring/${id}?/update`, {
		form: { amount: '2.000.000' },
		headers: { origin: baseURL!, accept: 'text/html' }
	});
	expect(res.ok()).toBe(true);
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(kv(page, 'Ingresos')).toContainText('2.000.000');
	await expect(kv(page, 'Ahorro')).toContainText('200.000');
	await expect(available(page)).toContainText('1.800.000');

	// Otro (direct URL renders the page variant): invalid values are rejected, valid ones saved.
	const alert = page.getByRole('alert');
	await page.goto('/plan/savings', { waitUntil: 'networkidle' });
	for (const [unit, value, message] of [
		['%', '150', 'Ingresá un porcentaje entre 0 y 100.'],
		['$', 'abc', 'Ingresá un monto de ahorro válido.']
	] as const) {
		await fillSavings(page, { option: 'Otro', unit, value });
		await savePlan(page).click();
		await expect(alert).toHaveText(message);
	}
	await fillSavings(page, { option: 'Otro', unit: '$', value: '1.000,50' });
	await savePlan(page).click();
	await expect(alert).toContainText(WHOLE_PESOS_ERROR);

	await fillSavings(page, { option: 'Otro', unit: '%', value: '12,5' });
	await savePlan(page).click();
	await expect(page.getByRole('button', { name: /^Otro/ })).toContainText('250.000');
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(kv(page, 'Ahorro')).toContainText('250.000');

	await page.goto('/plan/savings', { waitUntil: 'networkidle' });
	await fillSavings(page, { option: 'Otro', unit: '$', value: '100.000' });
	await savePlan(page).click();
	await expect(page.getByRole('button', { name: /^Otro/ })).toContainText('100.000');
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(kv(page, 'Ahorro')).toContainText('100.000');
});

test('new limit: validation, the average, and 404s for unknown or foreign ids', async ({
	page,
	browser,
	baseURL
}) => {
	// Free Comida (it holds a suggested limit from the wizard) so it is on offer again.
	await postDelete(page, baseURL!, `/plan/limits/${ids.food}`);

	await page.goto('/plan/limits/new', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByRole('alert')).toHaveText('Elegí una categoría.');
	await pick(page, 'Categoría', 'Comida e2e');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByRole('alert')).toHaveText('Ingresá un límite válido.');
	await page.locator('input[name="amount"]').fill('100,5');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText(WHOLE_PESOS_ERROR);
	await page.getByRole('button', { name: /^Usar promedio/ }).click();
	await expect(page.locator('input[name="amount"]')).toHaveValue(/^10\.?000$/);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/plan$/);
	await expect(limits(page)).toContainText('Comida e2e');

	// Unknown, malformed and foreign category ids are 404s.
	const foreign = await foreignCategory(browser, baseURL!);
	for (const id of ['00000000-0000-4000-8000-000000000000', 'x', foreign]) {
		const res = await page.goto(`/plan/limits/${id}`);
		expect(res!.status(), id).toBe(404);
	}
});

test('re-submitting step 3 keeps a this-month-only plan this-month-only', async ({ page }) => {
	const repeat = page.getByRole('switch', { name: 'Usar este plan todos los meses' });
	const save = async (check: boolean) => {
		await page.goto('/plan/setup?step=5', { waitUntil: 'networkidle' });
		if ((await repeat.isChecked()) !== check) await repeat.click();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Plan guardado.')).toBeVisible();
	};
	await save(false);

	await page.goto('/plan/setup?step=3', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);

	await page.goto('/plan/setup?step=5', { waitUntil: 'networkidle' });
	await expect(repeat).not.toBeChecked();
	await save(true);
});

test('a USD plan takes cents and can be created and deleted on its own', async ({
	page,
	baseURL
}) => {
	await setCurrencyCookie(page, baseURL!, 'USD');
	await page.goto('/plan/setup?step=3', { waitUntil: 'networkidle' });
	await fillSavings(page, { option: 'Otro', unit: 'US$', value: '10,50' });
	await page.getByRole('button', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);
	await page.getByRole('link', { name: 'Siguiente' }).click();
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByText('Plan guardado.')).toBeVisible();
	await expect(kv(page, 'Ahorro')).toContainText('10,50');

	await page.getByRole('button', { name: 'Eliminar plan' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
	await expect(page.getByText('Sin plan en dólares')).toBeVisible();
});

test('Eliminar plan on /plan removes the plan and keeps the fixed incomes', async ({ page }) => {
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Eliminar plan' }).click();
	await expect(page.getByText('¿Eliminar este plan?')).toBeVisible();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
	await expect(page).toHaveURL(/\/plan$/);
	await expect(page.getByText('Sin plan en pesos')).toBeVisible();
	await expect(page.getByRole('link', { name: /Sueldo e2e/ })).toBeVisible();

	// Without a plan the plan-only screens go back to /plan, and the wizard opens again.
	for (const url of ['/plan/savings', '/plan/limits/new']) {
		await page.goto(url);
		await expect(page).toHaveURL(/\/plan$/);
	}
	await page.goto('/plan/setup');
	await expect(page).toHaveURL(/\/plan\/setup$/);
});

test('step 2 suggests repeated outcomes and a tap opens the rule form prefilled', async ({
	page,
	baseURL
}) => {
	const [y, m] = todayInAppTz().split('-').map(Number);
	const headers = { origin: baseURL!, accept: 'text/html' };
	// The same outcome on the 15th of each of the last 3 full months.
	for (const back of [2, 3, 4]) {
		const res = await page.request.post('/movements/new', {
			form: {
				type: 'outcome',
				amount: '12345',
				description: 'Alquiler e2e',
				accountId: ids.account,
				categoryId: ids.food,
				occurredAt: new Date(Date.UTC(y, m - back, 15)).toISOString().slice(0, 10)
			},
			headers
		});
		expect(res.ok()).toBe(true);
	}
	// A one-off in a single month, arranged here: it must not be suggested.
	const oneOff = await page.request.post('/movements/new', {
		form: {
			type: 'outcome',
			amount: '9999',
			description: 'Cena suelta e2e',
			accountId: ids.account,
			categoryId: ids.food,
			occurredAt: lastMonth15()
		},
		headers
	});
	expect(oneOff.ok()).toBe(true);
	try {
		await page.goto('/plan/setup?step=2', { waitUntil: 'networkidle' });
		await expect(page.getByRole('heading', { name: 'Detectamos que se repiten' })).toBeVisible();
		// The one-off (a single month) is not a suggestion.
		await expect(page.getByRole('link', { name: /Cena suelta e2e/ })).toHaveCount(0);
		const suggestion = page.getByRole('link', { name: /Alquiler e2e/ });
		await expect(suggestion).toContainText('12.345');
		await expect(suggestion).toContainText('Día 15 · Caja e2e');
		await suggestion.click();

		const drawer = page.getByRole('dialog', { name: 'Nuevo pago fijo' });
		await expect(drawer).toBeVisible();
		await expect(page).toHaveURL(/\/plan\/setup\?step=2$/);
		await expect(drawer.locator('input[name="description"]')).toHaveValue('Alquiler e2e');
		await expect(drawer.locator('input[name="amount"]')).toHaveValue('12.345');
		await expect(drawer.getByRole('button', { name: /^Cuenta/ })).toContainText('Caja e2e');
		await expect(drawer.getByRole('button', { name: /^Categoría/ })).toContainText('Comida e2e');
		await drawer.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(drawer).toBeHidden();

		await expect(page).toHaveURL(/\/plan\/setup\?step=2$/);
		await expect(page.getByRole('link', { name: /Alquiler e2e/ })).toHaveCount(1);
		await expect(page.getByRole('heading', { name: 'Detectamos que se repiten' })).toHaveCount(0);
	} finally {
		await deleteRules(page, baseURL!, 'Alquiler e2e');
		await deleteMovements(page, baseURL!, 'Alquiler e2e');
		await deleteMovements(page, baseURL!, 'Cena suelta e2e');
	}
});
