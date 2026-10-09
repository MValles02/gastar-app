import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	deleteRules,
	fillRule,
	login,
	OTHER_EMAIL,
	postDelete,
	setCurrencyCookie,
	todayInAppTz
} from './helpers';

// Every test that writes runs as `otro` (ARS account "Otra cuenta pesos", category "Ajena"). Other specs
// change his data too, so every assertion is about one uniquely named row, never a count.
test.describe.configure({ timeout: 60_000 });

test.afterEach(async ({ context, baseURL }) => {
	await context.addCookies([{ name: 'currency', value: 'ARS', url: baseURL! }]);
});

const bell = (page: Page) => page.locator('header.top-bar a[aria-label^="Avisos"]');
const pesos = (page: Page) => page.getByRole('region', { name: 'Pesos' });
const alertRow = (page: Page, text: string) => pesos(page).locator('li', { hasText: text });

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
		await expect(row).toContainText('Otra cuenta pesos');
		await expect(bell(page)).toHaveAttribute('aria-label', /Avisos: \d+/);

		await row.getByRole('link').click();
		await expect(page.getByRole('heading', { level: 1, name: 'Registrar pago' })).toBeVisible();
		await page.getByRole('button', { name: 'Guardar movimiento' }).click();
		await expect(page).toHaveURL(/\/plan\?saved=1$/);

		await page.goto('/notifications');
		await expect(alertRow(page, description)).toHaveCount(0);
	} finally {
		await deleteMovements(page, baseURL!, description);
		await deleteRules(page, baseURL!, description);
	}
});

test('a plan alert opens /plan in its currency, and the page works without JS', async ({
	page,
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
		await page.goto('/plan/setup', { waitUntil: 'networkidle' });
		await expect(page.getByRole('list', { name: 'Pasos' })).toBeVisible();
		for (let i = 1; i < 3; i++) await page.getByRole('button', { name: 'Siguiente' }).click();
		const step3 = page.locator('section.step').nth(2);
		await step3.getByRole('radio', { name: 'Monto' }).check({ force: true });
		await step3.getByLabel('Monto a ahorrar').fill('99.999.999');
		await page.getByRole('button', { name: 'Siguiente' }).click();
		created = true; // none existed above, so whatever exists after this click is ours
		await page.getByRole('button', { name: 'Guardar plan' }).click();
		await expect(page).toHaveURL(/\/plan\?planSaved=1$/);

		// No JS: the server-rendered page carries plain links and a form that sets the currency.
		const html = await (await page.request.get('/notifications')).text();
		expect(html).toContain('Te pasaste del plan en pesos');
		expect(html).toMatch(/<form[^>]*method="POST"[^>]*action="\.?\/currency"/);
		expect(html).toMatch(/name="redirectTo"[^>]*value="\/plan"/);

		// The cookie says USD; the alert's form switches it to ARS.
		await setCurrencyCookie(page, baseURL!, 'USD');
		await page.goto('/notifications');
		const row = alertRow(page, 'Faltan');
		await expect(row).toContainText('Te pasaste');
		await row.getByRole('button').click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(page.getByRole('radio', { name: 'ARS' })).toBeChecked();
	} finally {
		await setCurrencyCookie(page, baseURL!, 'ARS');
		if (created) await postDelete(page, baseURL!, `${baseURL}/plan/setup`);
	}
});
