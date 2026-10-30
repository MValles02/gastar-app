import { expect, test, type Cookie, type Page } from '@playwright/test';
import {
	deleteMovements,
	deleteRules,
	fillMovement,
	fillRule,
	fillSavings,
	login,
	OTHER_EMAIL,
	pick,
	postDelete,
	setCurrencyCookie,
	signUpVerified,
	todayInAppTz
} from './helpers';

// Every test that writes runs as `otro` (ARS account "Otra cuenta pesos", category "Ajena"). Other specs
// change his data too, so every assertion is about one uniquely named row, never a count.
test.describe.configure({ timeout: 60_000 });

const bell = (page: Page) => page.locator('header.top-bar a[aria-label^="Avisos"]');
const pesos = (page: Page) => page.getByRole('region', { name: 'ARS' });
const alertRow = (page: Page, text: string) =>
	pesos(page).locator('[role="listitem"]', { hasText: text });

test('a payment due today alerts until it is registered', async ({ page, baseURL }) => {
	await login(page, OTHER_EMAIL);
	const description = `Aviso e2e ${Date.now()}`;
	try {
		await fillRule(page, {
			description,
			amount: '1.500',
			day: String(Number(todayInAppTz().slice(8))),
			account: 'Otra cuenta pesos',
			category: 'Ajena'
		});
		await page.getByRole('button', { name: 'Guardar' }).click();
		await expect(page).toHaveURL(/\/plan$/);

		await page.setViewportSize({ width: 375, height: 800 });
		await page.goto('/notifications');
		await expect(page.getByRole('heading', { level: 1, name: 'Avisos' })).toBeVisible();
		const row = alertRow(page, description);
		await expect(row).toContainText('Vence hoy');
		await expect(row).toContainText('desde Otra cuenta pesos');
		// The message is not clipped at phone width.
		const clipped = await row
			.locator('.row-meta')
			.evaluate((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth);
		expect(clipped).toBe(false);
		// The meta may wrap onto a second line.
		await expect(row.locator('.row-meta')).toHaveCSS('white-space', 'normal');
		await expect(row.locator('.row-meta')).toHaveCSS('-webkit-line-clamp', '2');
		// The bell lives on the full header (tab pages) only.
		await page.goto('/');
		await expect(bell(page)).toHaveAttribute('aria-label', /Avisos: \d+/);
		await page.goto('/notifications');

		await row.getByRole('link').click();
		await expect(page).toHaveURL(/\/plan\/recurring\/[0-9a-f-]{36}$/);
		await page.getByRole('link', { name: 'Registrar pago' }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Registrar pago' })).toBeVisible();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Pago registrado.')).toBeVisible();

		await page.goto('/notifications');
		await expect(alertRow(page, description)).toHaveCount(0);
	} finally {
		await deleteMovements(page, baseURL!, description);
		await deleteRules(page, baseURL!, description);
	}
});

// Runs as this file's own user (1 sign-up, see signUpVerified): the bell count is exact only when no
// other spec writes the same user's data.
test.describe('an overdue fixed income is neutral, never an alert', () => {
	const dayOfMonth = Number(todayInAppTz().slice(8));
	const yesterday = dayOfMonth - 1;
	let cookies: Cookie[] = [];

	test.beforeAll(async ({ browser, baseURL }) => {
		test.skip(dayOfMonth === 1, 'Nothing is overdue on the 1st.');
		test.setTimeout(90_000);
		const headers = { origin: baseURL!, accept: 'text/html' };
		const context = await browser.newContext({ baseURL });
		try {
			const page = await context.newPage();
			await signUpVerified(page, context.request, {
				email: `e2e+avisos-${Date.now()}@gastar.local`,
				password: 'e2e-pass-1234',
				name: 'E2E Avisos'
			});
			const create = async (path: string, form: Record<string, string>) => {
				const res = await page.request.post(path, { form, headers });
				expect(res.ok()).toBe(true);
				return res.url().split('/').pop()!;
			};
			const accountId = await create('/accounts/new', {
				name: 'Cuenta avisos',
				currency: 'ARS',
				initialBalance: '500',
				icon: 'bank',
				color: 'green'
			});
			const categoryId = await create('/categories/new', {
				name: 'Varios',
				color: 'blue',
				kind: ''
			});
			for (const [type, description] of [
				['income', 'Sueldo avisos'],
				['outcome', 'Alquiler avisos']
			])
				await create('/plan/recurring/new', {
					type,
					description,
					amount: '1000',
					dayOfMonth: String(yesterday),
					accountId,
					categoryId
				});
			cookies = await context.cookies();
		} finally {
			await context.close();
		}
	});

	test('Avisos and the bell skip it, and /plan shows it as expected', async ({ page }) => {
		await page.context().addCookies(cookies);
		await page.goto('/notifications');
		await expect(alertRow(page, 'Alquiler avisos')).toContainText(/Venció/);
		await expect(alertRow(page, 'Sueldo avisos')).toHaveCount(0);
		// Only the expense rule counts: the user has no plan, so nothing else alerts.
		await page.goto('/');
		await expect(bell(page)).toHaveAttribute('aria-label', 'Avisos: 1');

		await page.goto('/plan');
		const pill = (text: string) =>
			page.locator('.rule', { hasText: text }).locator('[data-slot="badge"]');
		await expect(pill('Sueldo avisos')).toHaveText(`Esperado el día ${yesterday}`);
		// Neutral: muted colour and no icon, unlike the overdue expense.
		await expect(pill('Sueldo avisos')).toHaveAttribute('style', /var\(--text-muted\)/);
		await expect(pill('Sueldo avisos').locator('svg')).toHaveCount(0);
		await expect(pill('Alquiler avisos')).toHaveAttribute('style', /var\(--negative\)/);
	});
});

test('a plan alert opens /plan in its currency, and the page works without JS', async ({
	page,
	browser,
	baseURL
}) => {
	await login(page, OTHER_EMAIL);
	await setCurrencyCookie(page, baseURL!, 'ARS');
	// Fail loudly if another spec gave otro an ARS plan: this test must own it to delete it.
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(page.getByText('Sin plan en pesos')).toBeVisible();
	let created = false;
	try {
		// Savings far above any income his ARS rules could add: over from the first day.
		await page.goto('/plan/setup?step=3', { waitUntil: 'networkidle' });
		await fillSavings(page, { option: 'Otro', unit: '$', value: '99.999.999' });
		await page.getByRole('button', { name: 'Siguiente' }).click();
		created = true; // none existed above, so whatever exists after this click is ours
		await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);
		await page.getByRole('link', { name: 'Siguiente' }).click();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Plan guardado.')).toBeVisible();

		// No JS: the server-rendered page carries plain links and a form that sets the currency.
		const noJs = await browser.newContext({
			baseURL,
			javaScriptEnabled: false,
			storageState: await page.context().storageState()
		});
		try {
			const bare = await noJs.newPage();
			await bare.goto('/notifications');
			const planAlert = alertRow(bare, 'Tu ahorro y tus pagos fijos superan tus ingresos por');
			await expect(planAlert).toBeVisible();
			await expect(planAlert).toContainText('Te pasaste');
			const form = pesos(bare)
				.locator('form')
				.filter({ hasText: 'Tu ahorro y tus pagos fijos superan tus ingresos por' });
			await expect(form).toHaveAttribute('method', 'POST');
			await expect(form).toHaveAttribute('action', /\/currency$/);
			await expect(form.locator('input[name="redirectTo"]')).toHaveValue('/plan');
		} finally {
			await noJs.close();
		}

		// The cookie says USD; the alert's form switches it to ARS.
		await setCurrencyCookie(page, baseURL!, 'USD');
		await page.goto('/notifications');
		const row = alertRow(page, 'Tu ahorro y tus pagos fijos superan tus ingresos por');
		await expect(row).toContainText('Te pasaste');
		await row.getByRole('button').click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(page.getByRole('radio', { name: 'ARS' })).toBeChecked();
	} finally {
		await setCurrencyCookie(page, baseURL!, 'ARS');
		if (created) await postDelete(page, baseURL!, `${baseURL}/plan`);
	}
});

test('a limit alert explains itself and opens its page in its currency', async ({
	page,
	baseURL
}) => {
	await login(page, OTHER_EMAIL);
	await setCurrencyCookie(page, baseURL!, 'ARS');
	// Fail loudly if another spec gave otro an ARS plan: this test must own it to delete it.
	await page.goto('/plan', { waitUntil: 'networkidle' });
	await expect(page.getByText('Sin plan en pesos')).toBeVisible();
	const description = `Límite aviso e2e ${Date.now()}`;
	let created = false;
	try {
		await page.goto('/plan/setup?step=3', { waitUntil: 'networkidle' });
		await fillSavings(page, { option: 'Nada' });
		await page.getByRole('button', { name: 'Siguiente' }).click();
		created = true;
		await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);
		await page.getByRole('link', { name: 'Siguiente' }).click();
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Plan guardado.')).toBeVisible();

		await page.goto('/plan/limits/new', { waitUntil: 'networkidle' });
		await pick(page, 'Categoría', 'Ajena');
		await page.locator('input[name="amount"]').fill('1');
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/plan$/);

		await fillMovement(page, {
			type: 'Gasto',
			amount: '2',
			description,
			account: 'Otra cuenta pesos',
			category: 'Ajena'
		});
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();

		// The cookie says USD; the limit alert's form switches it to ARS before opening the page.
		await setCurrencyCookie(page, baseURL!, 'USD');
		await page.goto('/notifications');
		const row = alertRow(page, '$1 sobre el límite de $1');
		await expect(row).toContainText('Ajena');
		// The message does not repeat the pill's "Te pasaste".
		await expect(row.locator('.row-meta')).toHaveText('$1 sobre el límite de $1');
		await row.getByRole('button').click();
		await expect(page).toHaveURL(/\/plan\/limits\/[0-9a-f-]{36}$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Límite de Ajena' })).toBeVisible();
	} finally {
		await setCurrencyCookie(page, baseURL!, 'ARS');
		await deleteMovements(page, baseURL!, description);
		if (created) await postDelete(page, baseURL!, `${baseURL}/plan`);
	}
});
