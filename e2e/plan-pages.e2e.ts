import { expect, test, type Cookie, type Page } from '@playwright/test';
import {
	createAccount,
	createVia,
	fillSavings,
	limitsRegion,
	linkId,
	monthDay,
	pick,
	pickDay,
	post,
	postDelete,
	save,
	signUpVerified,
	WHOLE_PESOS_ERROR,
	gotoHydrated
} from './helpers';

// Everything runs as one freshly signed-up user, so no other spec (and no demo-user month total) is
// disturbed. Tests are serial: each leaves the plan the next one expects (see the order below).
test.describe.configure({ mode: 'serial', timeout: 90_000 });

const password = 'e2e-pass-1234';
const ids = { account: '', food: '', gym: '', salary: '' };
let cookies: Cookie[] = [];

test.beforeAll(async ({ browser, baseURL }) => {
	const context = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		const email = `e2e+plan-${Date.now()}@gastar.local`;
		await signUpVerified(page, context.request, { email, password, name: 'E2E Plan' });

		const create = (path: string, form: Record<string, string>) =>
			createVia(page, baseURL!, path, form);
		ids.account = await createAccount(page, baseURL!, 'Caja e2e', 'ARS');
		await createAccount(page, baseURL!, 'Dólares e2e', 'USD');
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
			occurredAt: monthDay(2)
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
	page.getByRole('region', { name: /^Disponible$/ }).locator('.hero-amount');

test('the wizard saves the income, savings and limits its summary shows', async ({ page }) => {
	await gotoHydrated(page, '/plan/setup');
	await page.getByRole('link', { name: '+ Agregar' }).click();
	const drawer = page.getByRole('dialog', { name: 'Nuevo ingreso fijo' });
	await expect(drawer).toBeVisible();
	await drawer.locator('input[name="description"]').fill('Sueldo e2e');
	await drawer.locator('input[name="amount"]').fill('1.000.000');
	await pickDay(page, '5');
	await pick(page, 'Cuenta', 'Caja e2e');
	await pick(page, 'Categoría', 'Cobro e2e');
	await save(drawer).click();
	await expect(page.getByRole('link', { name: /Sueldo e2e/ })).toBeVisible();

	await gotoHydrated(page, '/plan/setup?step=3');
	await fillSavings(page, { option: '10%' });
	await page.getByRole('button', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);
	await page.getByRole('button', { name: 'Usar sugeridos' }).click();
	await expect(page.getByRole('link', { name: /Comida e2e/ })).toBeVisible();
	await page.getByRole('link', { name: '+ Agregar' }).click();
	const limitDrawer = page.getByRole('dialog', { name: 'Nuevo límite' });
	await pick(page, 'Categoría', 'Gym e2e');
	await limitDrawer.locator('input[name="amount"]').fill('5.000');
	await save(limitDrawer).click();
	await expect(page.getByRole('link', { name: /Gym e2e/ })).toBeVisible();

	await page.getByRole('link', { name: 'Siguiente' }).click();
	const summary = page.locator('dl.figures');
	await expect(summary).toContainText('1.000.000');
	await expect(summary).toContainText('100.000');
	await expect(summary).toContainText('900.000');
	await expect(summary).toContainText('Comida e2e');
	await expect(summary).toContainText('Gym e2e');
	await save(page).click();
	await expect(page.getByText('Plan guardado.')).toBeVisible();
});

test('10 % savings follows an income change, Otro validates and saves both', async ({
	page,
	baseURL
}) => {
	await gotoHydrated(page, '/plan');
	await expect(kv(page, 'Ingresos')).toContainText('1.000.000');
	await expect(kv(page, 'Ahorro')).toContainText('100.000');
	await expect(available(page)).toContainText('900.000');

	// The Ahorro drawer opens over the plan; 10 % is the pick.
	await page.getByRole('link', { name: 'Ahorro', exact: true }).click();
	await expect(page).toHaveURL(/\/plan$/);
	await expect(page.getByRole('button', { name: /^10 %/ })).toHaveAttribute('aria-pressed', 'true');

	// Raise the income through the rule's update action.
	await gotoHydrated(page, '/plan');
	const id = await linkId(page.getByRole('link', { name: /Sueldo e2e/ }));
	const res = await post(page, baseURL!, `/plan/recurring/${id}?/update`, { amount: '2.000.000' });
	expect(res.ok()).toBe(true);
	await gotoHydrated(page, '/plan');
	await expect(kv(page, 'Ingresos')).toContainText('2.000.000');
	await expect(kv(page, 'Ahorro')).toContainText('200.000');
	await expect(available(page)).toContainText('1.800.000');

	// Otro (direct URL renders the page variant): invalid values are rejected, valid ones saved.
	const alert = page.getByRole('alert');
	await gotoHydrated(page, '/plan/savings');
	for (const [unit, value, message] of [
		['%', '150', 'Ingresá un porcentaje entre 0 y 100.']
	] as const) {
		await fillSavings(page, { option: 'Otro', unit, value });
		await save(page).click();
		await expect(alert).toHaveText(message);
	}
	await fillSavings(page, { option: 'Otro', unit: '$', value: '1.000,50' });
	await save(page).click();
	await expect(alert).toContainText(WHOLE_PESOS_ERROR);

	await fillSavings(page, { option: 'Otro', unit: '%', value: '12,5' });
	await save(page).click();
	await expect(page.getByRole('button', { name: /^Otro/ })).toContainText('250.000');
	await gotoHydrated(page, '/plan');
	await expect(kv(page, 'Ahorro')).toContainText('250.000');

	await gotoHydrated(page, '/plan/savings');
	await fillSavings(page, { option: 'Otro', unit: '$', value: '100.000' });
	await save(page).click();
	await expect(page.getByRole('button', { name: /^Otro/ })).toContainText('100.000');
	await gotoHydrated(page, '/plan');
	await expect(kv(page, 'Ahorro')).toContainText('100.000');
});

test('new limit: invalid amount, then the average saves', async ({ page, baseURL }) => {
	// Free Comida (it holds a suggested limit from the wizard) so it is on offer again.
	await postDelete(page, baseURL!, `/plan/limits/${ids.food}`);

	await gotoHydrated(page, '/plan/limits/new');
	await pick(page, 'Categoría', 'Comida e2e');
	await page.locator('input[name="amount"]').fill('100,5');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText(WHOLE_PESOS_ERROR);
	await page.getByRole('button', { name: /^Usar promedio/ }).click();
	await expect(page.locator('input[name="amount"]')).toHaveValue(/^10\.?000$/);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/plan$/);
	await expect(limitsRegion(page)).toContainText('Comida e2e');
});

test('re-submitting step 3 keeps a this-month-only plan this-month-only', async ({ page }) => {
	const repeat = page.getByRole('switch', { name: 'Usar este plan todos los meses' });
	const save = async (check: boolean) => {
		await gotoHydrated(page, '/plan/setup?step=5');
		if ((await repeat.isChecked()) !== check) await repeat.click();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Plan guardado.')).toBeVisible();
	};
	await save(false);

	await gotoHydrated(page, '/plan/setup?step=3');
	await page.getByRole('button', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);

	await gotoHydrated(page, '/plan/setup?step=5');
	await expect(repeat).not.toBeChecked();
	await save(true);
});

test('Eliminar plan on /plan removes the plan and keeps the fixed incomes', async ({ page }) => {
	await gotoHydrated(page, '/plan');
	await page.getByRole('button', { name: 'Eliminar plan' }).click();
	await expect(page.getByText('¿Eliminar este plan?')).toBeVisible();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
	await expect(page).toHaveURL(/\/plan$/);
	await expect(page.getByText('Sin plan')).toBeVisible();
	await expect(page.getByRole('link', { name: /Sueldo e2e/ })).toBeVisible();

	// Without a plan the plan-only screens go back to /plan, and the wizard opens again.
	for (const url of ['/plan/savings', '/plan/limits/new']) {
		await page.goto(url);
		await expect(page).toHaveURL(/\/plan$/);
	}
	await page.goto('/plan/setup');
	await expect(page).toHaveURL(/\/plan\/setup$/);
});
