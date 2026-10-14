import { expect, test, type Page } from '@playwright/test';
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
	todayInAppTz
} from './helpers';

// Every test that writes runs as `otro` (ARS account "Otra cuenta pesos", category "Ajena"). Other specs
// change his data too, so every assertion is about one uniquely named row, never a count.
test.describe.configure({ timeout: 60_000 });

const bell = (page: Page) => page.locator('header.top-bar a[aria-label^="Avisos"]');
const pesos = (page: Page) => page.getByRole('region', { name: 'Pesos' });
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

		await page.goto('/notifications');
		await expect(page.getByRole('heading', { level: 1, name: 'Avisos' })).toBeVisible();
		const row = alertRow(page, description);
		await expect(row).toContainText('Vence hoy');
		await expect(row).toContainText('desde Otra cuenta pesos');
		await expect(row.locator('.sub')).toHaveCSS('white-space', 'nowrap');
		// The bell lives on the full header (tab pages) only.
		await page.goto('/');
		await expect(bell(page)).toHaveAttribute('aria-label', /Avisos: \d+/);
		await page.goto('/notifications');

		await row.getByRole('link').click();
		await expect(page).toHaveURL(/\/plan\/recurring\/[0-9a-f-]{36}$/);
		await page.getByRole('link', { name: 'Registrar pago' }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Registrar pago' })).toBeVisible();
		await page.getByRole('button', { name: 'Guardar movimiento' }).click();
		await expect(page.getByText('Pago registrado.')).toBeVisible();

		await page.goto('/notifications');
		await expect(alertRow(page, description)).toHaveCount(0);
	} finally {
		await deleteMovements(page, baseURL!, description);
		await deleteRules(page, baseURL!, description);
	}
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
	await expect(page.getByText('Todavía no tenés un plan en pesos.')).toBeVisible();
	let created = false;
	try {
		// Savings far above any income his ARS rules could add: over from the first day.
		await page.goto('/plan/setup?step=3', { waitUntil: 'networkidle' });
		await fillSavings(page, { option: 'Otro', unit: '$', value: '99.999.999' });
		await page.getByRole('button', { name: 'Siguiente' }).click();
		created = true; // none existed above, so whatever exists after this click is ours
		await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);
		await page.getByRole('link', { name: 'Siguiente' }).click();
		await page.getByRole('button', { name: 'Guardar plan' }).click();
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
			const form = planAlert.locator('form');
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
	await expect(page.getByText('Todavía no tenés un plan en pesos.')).toBeVisible();
	const description = `Límite aviso e2e ${Date.now()}`;
	let created = false;
	try {
		await page.goto('/plan/setup?step=3', { waitUntil: 'networkidle' });
		await fillSavings(page, { option: 'Nada' });
		await page.getByRole('button', { name: 'Siguiente' }).click();
		created = true;
		await expect(page).toHaveURL(/\/plan\/setup\?step=4$/);
		await page.getByRole('link', { name: 'Siguiente' }).click();
		await page.getByRole('button', { name: 'Guardar plan' }).click();
		await expect(page.getByText('Plan guardado.')).toBeVisible();

		await page.goto('/plan/limits/new', { waitUntil: 'networkidle' });
		await pick(page, 'Categoría', 'Ajena');
		await page.locator('input[name="amount"]').fill('1');
		await page.getByRole('button', { name: 'Guardar límite' }).click();
		await expect(page).toHaveURL(/\/plan$/);

		await fillMovement(page, {
			type: 'Gasto',
			amount: '2',
			description,
			account: 'Otra cuenta pesos',
			category: 'Ajena'
		});
		await page.getByRole('button', { name: 'Guardar movimiento' }).click();
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();

		// The cookie says USD; the limit alert's form switches it to ARS before opening the page.
		await setCurrencyCookie(page, baseURL!, 'USD');
		await page.goto('/notifications');
		const row = alertRow(page, 'Te pasaste $1 del límite de $1');
		await expect(row).toContainText('Ajena');
		await row.getByRole('button').click();
		await expect(page).toHaveURL(/\/plan\/limits\/[0-9a-f-]{36}$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Límite de Ajena' })).toBeVisible();
	} finally {
		await setCurrencyCookie(page, baseURL!, 'ARS');
		await deleteMovements(page, baseURL!, description);
		if (created) await postDelete(page, baseURL!, `${baseURL}/plan`);
	}
});
