// Inicio and Avisos redesign (F3): first-run checklist, Pesos / Dólares pills, overspent hero, the
// Mercado Pago pill and the Avisos rows. Runs as this file's own user (1 sign-up, see signUpVerified), so
// every figure is exact: no other spec writes this user's data. The tests depend on each other (serial).
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import postgres from 'postgres';
import { fillMovement, fillSavings, pick, PHONE, signUpVerified, todayInAppTz } from './helpers';

test.describe.configure({ mode: 'serial', timeout: 90_000 });

const email = `e2e+home-${Date.now()}@gastar.local`;
let context: BrowserContext;
let page: Page;
let baseURL: string;
let accountId = '';
let categoryId = '';

const checklist = () => page.getByRole('region', { name: 'Empezá en 3 pasos' });
const step = (title: RegExp) => checklist().getByRole('listitem').filter({ hasText: title });
const pill = (name: string) => page.getByRole('button', { name, exact: true });
const mpLink = () => page.getByRole('link', { name: /^Mercado Pago/ });

async function withDb<T>(fn: (sql: postgres.Sql) => Promise<T>) {
	const sql = postgres(
		process.env.DATABASE_URL || 'postgres://gastar:gastar@localhost:5432/gastar'
	);
	try {
		return await fn(sql);
	} finally {
		await sql.end();
	}
}

const post = async (path: string, form: Record<string, string>) => {
	const res = await page.request.post(path, {
		form,
		headers: { origin: baseURL, accept: 'text/html' }
	});
	expect(res.ok()).toBe(true);
	return res.url().split('/').pop()!;
};

test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
	baseURL = testInfo.project.use.baseURL!;
	context = await browser.newContext({ baseURL, viewport: PHONE });
	page = await context.newPage();
	await signUpVerified(page, context.request, {
		email,
		password: 'e2e-pass-1234',
		name: 'E2E Home'
	});
});

test.afterAll(async () => {
	await context.close();
});

test('first run: three steps, only the first is a link, and nothing else is on the page', async () => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(checklist()).toBeVisible();
	await expect(checklist().getByRole('listitem')).toHaveCount(3);
	await expect(step(/Creá tu primera cuenta/).getByRole('link')).toBeVisible();
	await expect(step(/Registrá un movimiento/).getByRole('link')).toHaveCount(0);
	await expect(step(/Armá tu plan/).getByRole('link')).toHaveCount(0);
	// No account: no currency pills, no hero and no "Sin cuentas." sentence.
	await expect(pill('Pesos')).toHaveCount(0);
	await expect(page.getByText('Sin cuentas.')).toHaveCount(0);
	await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
});

test('step 1 ticks after creating an account; Avisos is empty and Mercado Pago is not shown', async () => {
	await step(/Creá tu primera cuenta/)
		.getByRole('link')
		.click();
	await expect(page).toHaveURL(/\/accounts\/new$/);
	await page.getByLabel('Nombre').fill('Caja home');
	await page.getByLabel('Saldo inicial').fill('1.000');
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	accountId = page.url().split('/').pop()!;

	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(step(/Creá tu primera cuenta/)).toContainText('Hecho');
	await expect(step(/Creá tu primera cuenta/).getByRole('link')).toHaveCount(0);
	await expect(step(/Registrá un movimiento/).getByRole('link')).toBeVisible();
	await expect(step(/Armá tu plan/).getByRole('link')).toBeVisible();
	await expect(pill('Pesos')).toHaveAttribute('aria-pressed', 'true');
	// Not linked: nothing in the Mercado Pago spot.
	await expect(mpLink()).toHaveCount(0);

	await page.goto('/notifications', { waitUntil: 'networkidle' });
	await expect(page.getByText('Estás al día.')).toBeVisible();
	await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
});

test('step 2 opens the new-movement drawer in place and ticks after saving', async () => {
	categoryId = await post('/categories/new', { name: 'Varios home', color: 'blue', kind: '' });
	await page.goto('/', { waitUntil: 'networkidle' });
	await step(/Registrá un movimiento/)
		.getByRole('link')
		.click();
	const drawer = page.getByRole('dialog', { name: 'Nuevo movimiento' });
	await expect(drawer).toBeVisible();
	await expect(page).toHaveURL(/\/$/);
	await page.locator('input[name="amount"]').fill('100');
	await page.locator('input[name="description"]').fill('Primer gasto home');
	await pick(page, 'Cuenta', 'Caja home');
	await pick(page, 'Categoría', 'Varios home');
	await drawer.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByText('Movimiento guardado.').first()).toBeVisible();
	await expect(drawer).toBeHidden();

	await expect(step(/Registrá un movimiento/)).toContainText('Hecho');
	await expect(step(/Registrá un movimiento/).getByRole('link')).toHaveCount(0);
	// The row says "Hoy" like the Movimientos list.
	await expect(page.getByRole('listitem').filter({ hasText: 'Primer gasto home' })).toContainText(
		'Hoy'
	);
});

test('step 3 ticks after the plan wizard and the checklist is gone; the overspent hero says Te pasaste', async () => {
	await step(/Armá tu plan/)
		.getByRole('link')
		.click();
	await expect(page).toHaveURL(/\/plan\/setup/);
	await page.getByRole('link', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/step=2$/);
	await page.getByRole('link', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/step=3$/);
	// Savings far above any income: over from the first day.
	await fillSavings(page, { option: 'Otro', unit: '$', value: '99.999.999' });
	await page.getByRole('button', { name: 'Siguiente' }).click();
	await expect(page).toHaveURL(/step=4$/);
	await page.getByRole('link', { name: 'Siguiente' }).click();
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByText('Plan guardado.')).toBeVisible();
	// Saving from a wizard opened on Inicio leaves no wizard step behind /plan.
	await expect(page).toHaveURL(/\/plan$/);
	await page.goBack();
	await expect(page).not.toHaveURL(/\/plan\/setup/);
	await expect(page).toHaveURL(/\/$/);

	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(page.getByRole('region', { name: 'Empezá en 3 pasos' })).toHaveCount(0);

	const card = page.getByRole('region', { name: 'Disponible', exact: true });
	await expect(card.getByText('Te pasaste', { exact: true })).toBeVisible();
	// Negative in colour; the minus is only the screen-reader prefix.
	const amount = card.locator('.available-amount .money');
	await expect(amount).toHaveClass(/outcome/);
	expect((await amount.textContent())!.trim()).toMatch(/^-?\$[\d.]+$/);
	await expect(card).toContainText(/\$0 por día · (queda 1 día|quedan \d+ días)/);
	await expect(card.getByText('Saldo total', { exact: true })).toBeVisible();
	await expect(card.getByText('Resultado del mes', { exact: true })).toBeVisible();
	// The month result is a spend of $100: red, no sign.
	await expect(card.locator('.net .money')).toHaveClass(/outcome/);
	await expect(card.getByRole('link', { name: 'Ver plan' })).toHaveCount(0);
});

test('Pesos / Dólares switch by tap, without a full page load', async () => {
	// A USD account without movements nor plan.
	await post('/accounts/new', {
		name: 'Caja dólares home',
		currency: 'USD',
		initialBalance: '250',
		icon: 'bank',
		color: 'green'
	});
	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(pill('Pesos')).toHaveAttribute('aria-pressed', 'true');
	await page.evaluate(() => {
		(window as unknown as { __marker: string }).__marker = 'same-document';
	});
	const marker = () =>
		page.evaluate(() => (window as unknown as { __marker?: string }).__marker ?? null);

	await pill('Dólares').click();
	await expect(pill('Dólares')).toHaveAttribute('aria-pressed', 'true');
	const usd = page.getByRole('region', { name: 'Saldo total', exact: true });
	await expect(usd).toContainText('US$250,00');
	await expect(usd.getByRole('link', { name: 'Crear plan' })).toHaveAttribute(
		'href',
		'/plan/setup'
	);
	await expect(usd).toContainText('Resultado del mes');
	// Nothing in dollars yet: one sentence, and no spending section.
	await expect(page.getByText('Todavía no hay movimientos en dólares.')).toBeVisible();
	await expect(page.getByRole('heading', { name: /^Gastos de / })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Ver todos' })).toHaveCount(0);
	expect(await marker()).toBe('same-document');

	await pill('Pesos').click();
	await expect(pill('Pesos')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('region', { name: 'Disponible', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: /^Gastos de / })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Ver reportes' })).toHaveAttribute(
		'href',
		'/reports'
	);
	await expect(page.getByRole('link', { name: 'Ver todos' })).toHaveAttribute(
		'href',
		'/movements?currency=ARS'
	);
	expect(await marker()).toBe('same-document');
});

test('Mercado Pago pill: pending items, one item, up to date', async () => {
	const link = (name: string) => page.getByRole('link', { name, exact: true });
	await withDb(async (sql) => {
		const [{ id: userId }] = await sql`select id from "user" where email = ${email}`;
		await sql`
			insert into mp_connections (user_id, account_id, mp_user_id, access_token, expires_at)
			values (${userId}, ${accountId}, 'home-e2e', 'v1:AAAA', now() + interval '1 day')
		`;
		for (const n of [1, 2])
			await sql`
				insert into mp_import_items (user_id, account_id, external_key, kind, occurred_at, amount, is_credit, source_id, raw_description)
				values (${userId}, ${accountId}, ${`home-e2e-${n}`}, 'payment', now(), ${n * 1000}, false, ${`home-e2e-${n}`}, 'Pago home')
			`;
	});

	await page.goto('/', { waitUntil: 'networkidle' });
	const pending = link('Mercado Pago: 2 movimientos para revisar');
	await expect(pending).toContainText('2 para revisar');
	expect((await pending.boundingBox())!.height).toBeGreaterThanOrEqual(44);
	await pending.click();
	await expect(page).toHaveURL(/\/imports$/);
	await expect(page.locator('[data-slot="item-group"] [role="listitem"]')).toHaveCount(2);

	await withDb(
		(sql) => sql`update mp_import_items set status = 'rejected' where external_key = 'home-e2e-1'`
	);
	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(link('Mercado Pago: 1 movimiento para revisar')).toContainText('1 para revisar');

	await withDb(
		(sql) => sql`update mp_import_items set status = 'rejected' where external_key = 'home-e2e-2'`
	);
	await page.goto('/', { waitUntil: 'networkidle' });
	const quiet = link('Mercado Pago: al día');
	await expect(quiet).toContainText('al día');
	await expect(quiet).toHaveAttribute('href', '/imports');
});

test('Avisos: Pesos group, limit and plan rows through the currency switch, payment row with amount', async () => {
	await post('/plan/limits/new', { categoryId, amount: '1' });
	await fillMovement(page, {
		type: 'Gasto',
		amount: '2',
		description: 'Exceso home',
		account: 'Caja home',
		category: 'Varios home'
	});
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page.getByText('Movimiento guardado.').first()).toBeVisible();
	await post('/plan/recurring/new', {
		type: 'outcome',
		description: 'Internet home',
		amount: '1500',
		dayOfMonth: String(Number(todayInAppTz().slice(8))),
		accountId,
		categoryId
	});

	await page.goto('/notifications', { waitUntil: 'networkidle' });
	await expect(page.getByRole('heading', { level: 2, name: 'Pesos' })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Dólares' })).toHaveCount(0);
	const pesos = page.getByRole('region', { name: 'Pesos' });
	const row = (text: string) => pesos.getByRole('listitem').filter({ hasText: text });

	const payment = row('Internet home');
	await expect(payment).toContainText('Vence hoy · Caja home');
	await expect(payment).toContainText('$1.500');
	await expect(payment.locator('[data-slot="badge"]')).toHaveCount(0);
	await expect(payment.locator('.money')).toHaveClass(/outcome/);

	await expect(row('Tu ahorro y tus pagos fijos')).toContainText('Te pasaste');
	const limit = row('sobre el límite de $1');
	await expect(limit).toContainText('Varios home');
	await expect(limit).toContainText('Te pasaste');

	await limit.getByRole('button').click();
	await expect(page).toHaveURL(/\/plan\/limits\/[0-9a-f-]{36}$/);

	await page.goto('/notifications', { waitUntil: 'networkidle' });
	await payment.getByRole('link').click();
	await expect(page).toHaveURL(/\/plan\/recurring\/[0-9a-f-]{36}$/);
});
