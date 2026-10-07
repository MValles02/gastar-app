import { expect, test, type Page } from '@playwright/test';

// Same defaults as scripts/seed.js (local demo users, not secrets).
const password = process.env.SEED_PASSWORD || 'demo1234';
const otherEmail = 'otro@gastar.local';

// Every test that writes runs as `otro` (ARS account "Otra cuenta pesos", category "Ajena"). Other specs
// change his data too, so every assertion is about one uniquely named row, never a count.
test.describe.configure({ timeout: 60_000 });

async function login(page: Page) {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByLabel('Email').fill(otherEmail);
	await page.getByLabel('Contraseña').fill(password);
	await page.getByRole('button', { name: 'Ingresar' }).click();
	await expect(page).toHaveURL(/\/$/);
}

test.afterEach(async ({ context, baseURL }) => {
	await context.addCookies([{ name: 'currency', value: 'ARS', url: baseURL! }]);
});

const bell = (page: Page) => page.locator('header.top-bar a[aria-label^="Avisos"]');
const pesos = (page: Page) => page.getByRole('region', { name: 'Pesos' });
const alertRow = (page: Page, text: string) => pesos(page).locator('li', { hasText: text });

const todayDay = () =>
	Number(
		new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
			.format(new Date())
			.slice(8)
	);

async function pick(page: Page, legend: string, name: string) {
	await page.getByRole('button', { name: new RegExp(legend) }).click();
	await page.getByRole('dialog').getByText(name, { exact: true }).click();
}

const del = (page: Page, baseURL: string, href: string, action = 'delete') =>
	page.request.post(`${href}?/${action}`, {
		form: {},
		headers: { origin: baseURL, accept: 'text/html' }
	});

test('a payment due today alerts until it is registered', async ({ page, baseURL }) => {
	await login(page);
	const description = `Aviso e2e ${Date.now()}`;
	try {
		await page.goto('/plan/recurring/new', { waitUntil: 'networkidle' });
		await page.locator('input[name="description"]').fill(description);
		await page.locator('input[name="amount"]').fill('1.500');
		await page.locator('input[name="dayOfMonth"]').fill(String(todayDay()));
		await pick(page, 'Cuenta', 'Otra cuenta pesos');
		await pick(page, 'Categoría', 'Ajena');
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
		await page.goto(`/movements?q=${encodeURIComponent(description)}`);
		const movements = await page
			.locator('a[href*="movements/"]')
			.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
		for (const href of movements.filter((h) => /\/movements\/[0-9a-f-]{36}$/.test(h)))
			await del(page, baseURL!, href);
		await page.goto('/plan');
		const rules = await page
			.locator('li.rule', { hasText: description })
			.locator('a.main')
			.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
		for (const href of rules) await del(page, baseURL!, href);
	}
});

test('a plan alert opens /plan in its currency, and the page works without JS', async ({
	page,
	baseURL
}) => {
	await login(page);
	await page.context().addCookies([{ name: 'currency', value: 'ARS', url: baseURL! }]);
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
		await page.context().addCookies([{ name: 'currency', value: 'USD', url: baseURL! }]);
		await page.goto('/notifications');
		const row = alertRow(page, 'Te pasaste del plan en pesos');
		await expect(row).toContainText('Tu ahorro y tus pagos fijos superan tus ingresos por');
		await row.getByRole('button').click();
		await expect(page).toHaveURL(/\/plan$/);
		await expect(page.getByRole('radio', { name: 'ARS' })).toBeChecked();
	} finally {
		await page.context().addCookies([{ name: 'currency', value: 'ARS', url: baseURL! }]);
		if (created) await del(page, baseURL!, `${baseURL}/plan/setup`);
	}
});
