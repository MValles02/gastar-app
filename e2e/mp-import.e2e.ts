import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	findMovements,
	IMPORT_EMAIL,
	login,
	MOVEMENT_DETAIL_RE,
	OTHER_EMAIL,
	pick,
	postDelete,
	SEED_EMAIL
} from './helpers';

const FAKE = `http://127.0.0.1:${Number(process.env.FAKE_MP_PORT) || 5199}`;
const TOKEN = 'TEST-fake-mp-token';
const DAY_MS = 86_400_000;

test.describe.configure({ mode: 'serial' });

let page: Page;

const rows = () => page.locator('[data-slot="item-group"] [role="listitem"]');
const fake = (path: string, body?: unknown) =>
	fetch(FAKE + path, {
		method: body === undefined ? 'GET' : 'POST',
		body: body === undefined ? undefined : JSON.stringify(body)
	});
const calls = async () =>
	(await (await fake('/__fake/requests')).json()) as {
		method: string;
		path: string;
		query: Record<string, string>;
		authorization: string | null;
	}[];
const reportRequests = async () =>
	(await calls()).filter((r) => r.method === 'POST' && r.path === '/v1/account/settlement_report')
		.length;
/** begin_date of every payments search, oldest call first. */
const searchBegins = async () =>
	(await calls())
		.filter((r) => r.path === '/v1/payments/search')
		.map((r) => Date.parse(r.query.begin_date));

/** Clicks "Sincronizar ahora" and reloads until the run is over (the lease is taken before the redirect). */
async function syncNow(expected: RegExp) {
	await page.goto('/imports', { waitUntil: 'networkidle' });
	// Wait for the action: once it answers, the lease is held and stale statuses can't match.
	await Promise.all([
		page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/imports')),
		page.getByRole('button', { name: 'Sincronizar ahora' }).click()
	]);
	await expect(async () => {
		await page.reload();
		await expect(page.getByRole('status')).toHaveText(expected);
	}).toPass({ timeout: 30_000, intervals: [300, 500, 1000] });
}

const accountRow = async () => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	return (await page.getByRole('link', { name: /Mercado Pago/ }).textContent())!.trim();
};

// Letters only, so the digits of the suffix never leak into balance parsing; local DBs are reused.
const sfx = Date.now()
	.toString()
	.replace(/\d/g, (d) => 'abcdefghij'[Number(d)]);
const CATEGORY = `Cat MP ${sfx}`;
const SECOND = `Cuenta MP ${sfx}`;
const AMIGA_DESC = `Pago amiga ${sfx}`;
const PAYOUT_DESC = `Retiro MP ${sfx}`;
const YIELD_DESC = `Rendimiento MP ${sfx}`;
let origin = '';
let categoryUrl = '';
let secondUrl = '';
let pendingId = '';

/** Rounded whole-peso balance shown on /accounts for the account whose name matches `name`. */
const balanceOf = async (name: string) => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	const text = await page.getByRole('link', { name }).locator('.amount').first().textContent();
	return Number(text!.replace(/[^\d-]/g, ''));
};

const flash = (text: string) => expect(page.getByText(text)).toBeVisible();

/** Opens the detail of the pending item whose list row contains all `texts`. */
async function openItem(...texts: string[]) {
	await page.goto('/imports', { waitUntil: 'networkidle' });
	let row = rows();
	for (const t of texts) row = row.filter({ hasText: t });
	await row.getByRole('link').click();
	await expect(page).toHaveURL(/\/imports\/[0-9a-f-]{36}$/);
	// Hydrated: the confirm dialog replaces its no-JS fallback only after mount.
	await page.waitForLoadState('networkidle');
}

/** The read-only "Fecha" of the open item. */
const itemDate = () => page.locator('dt', { hasText: 'Fecha' }).locator('+ dd');

test.beforeAll(async ({ browser }) => {
	await fake('/__fake/reset', {});
	page = await browser.newPage();
	await login(page, IMPORT_EMAIL);
	origin = new URL(page.url()).origin;
	const res = await page.request.post('/dev/mp-reset', { headers: { origin } });
	expect(res.status()).toBe(204);
});

test.afterAll(async () => {
	for (const d of [AMIGA_DESC, PAYOUT_DESC, YIELD_DESC]) await deleteMovements(page, origin, d);
	for (const url of [secondUrl, categoryUrl]) if (url) await postDelete(page, origin, url);
	await page.close();
});

test('sync fills the inbox and leaves balances alone', async () => {
	const balance = await accountRow();

	await syncNow(/Última sincronización/);
	await expect(rows()).toHaveCount(8);
	const main = page.locator('main');
	await expect(main.getByText('FAKE AMIGA')).toHaveCount(2);
	await expect(main.getByText('CAFE DE PRUEBA')).toBeVisible();
	await expect(main.getByText('Ingreso de dinero')).toBeVisible();
	await expect(main.getByText('Transferencia o retiro')).toBeVisible();
	await expect(main.getByText('Pago en comercio')).toBeVisible();
	await expect(main.getByText('Rendimientos')).toHaveCount(2);
	// Credit-card payments never touch the balance; rejected ones never happened.
	await expect(main.getByText('TIENDA CON TARJETA')).toHaveCount(0);
	await expect(main.getByText('PAGO RECHAZADO')).toHaveCount(0);

	// First run: payments from the 30-day backfill; the settlement config is never touched.
	const [first] = await searchBegins();
	expect(Date.now() - first).toBeGreaterThan(29 * DAY_MS);
	expect((await calls()).filter((c) => c.path.includes('/config'))).toHaveLength(0);

	expect(await accountRow()).toBe(balance);

	await page.goto('/profile', { waitUntil: 'networkidle' });
	await expect(page.getByRole('link', { name: /Mercado Pago/ })).toContainText('8');
});

test('a second sync searches from the last payment and keeps the same items', async () => {
	const before = await reportRequests();
	await syncNow(/Última sincronización/);
	expect(await reportRequests()).toBe(before + 1);
	await expect(rows()).toHaveCount(8);
	// The newest imported payment is 11 days old; the search restarts there minus 3 days of overlap.
	const age = Date.now() - (await searchBegins()).at(-1)!;
	expect(age).toBeGreaterThan(13 * DAY_MS);
	expect(age).toBeLessThan(15 * DAY_MS);
});

test('an auth failure shows the sync error', async () => {
	await fake('/__fake/status', { status: 401 });
	try {
		await syncNow(/No se pudo sincronizar/);
	} finally {
		await fake('/__fake/status', { status: null });
	}
});

test('every MP call carries the bearer token', async () => {
	const all = await calls();
	expect(all.length).toBeGreaterThan(0);
	for (const c of all) expect(c.authorization).toBe(`Bearer ${TOKEN}`);
});

test('approving a payment keeps its exact cents, time of day and moves the balance', async () => {
	await page.goto('/categories/new', { waitUntil: 'networkidle' });
	await page.locator('input[name="name"]').fill(CATEGORY);
	await page.getByRole('radio', { name: 'Ingreso' }).check({ force: true });
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/categories\/[0-9a-f-]{36}$/);
	categoryUrl = page.url();
	await page.goto('/accounts/new', { waitUntil: 'networkidle' });
	await page.getByLabel('Nombre').fill(SECOND);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	secondUrl = page.url();

	const before = await balanceOf('Mercado Pago');
	await openItem('FAKE AMIGA', '$1.235');
	await expect(page.locator('dd', { hasText: 'FAKE AMIGA' })).toBeVisible();
	await expect(itemDate()).toContainText('10:15');
	await expect(page.getByRole('radio', { name: 'Ingreso' })).toBeChecked();
	// The fixture names are padded with spaces; the prefilled title must be trimmed.
	await expect(page.locator('input[name="description"]')).toHaveValue('FAKE AMIGA');
	await page.locator('input[name="description"]').fill(AMIGA_DESC);
	await pick(page, 'Categoría', CATEGORY);
	await page.getByRole('button', { name: 'Aprobar' }).click();
	await flash('Movimiento aprobado.');
	await expect(rows().filter({ hasText: '$1.235' })).toHaveCount(0);

	const [href] = await findMovements(page, AMIGA_DESC);
	expect(href).toMatch(MOVEMENT_DETAIL_RE);
	await page.goto(`${href}/edit`, { waitUntil: 'networkidle' });
	await expect(page.locator('input[name="amount"]')).toHaveValue('1.234,56');

	// Whole-peso display: the delta of the rounded balances is within a peso of the exact one.
	expect(Math.abs((await balanceOf('Mercado Pago')) - before - 1234.56)).toBeLessThanOrEqual(1);
});

test('editing the imported movement keeps its non-whole amount', async () => {
	const [href] = await findMovements(page, AMIGA_DESC);
	await page.goto(`${href}/edit`, { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Guardar cambios' }).click();
	await expect(page).toHaveURL(MOVEMENT_DETAIL_RE);
	await expect(page.getByText('Los montos en pesos van sin decimales.')).toHaveCount(0);
});

test('a learned rule suggests the category for the next item', async () => {
	await page.goto('/imports', { waitUntil: 'networkidle' });
	const row = rows().filter({ hasText: 'FAKE AMIGA' });
	await expect(row).toHaveCount(1);
	await expect(row).toContainText(`Sugerido: ${CATEGORY}`);
	await row.getByRole('link').click();
	pendingId = new URL(page.url()).pathname.split('/').pop()!;
	await expect(page.locator('input[name="description"]')).toHaveValue(AMIGA_DESC);
	await expect(page.getByRole('radio', { name: 'Ingreso' })).toBeChecked();
	await expect(page.getByRole('button', { name: /Categoría/ })).toContainText(CATEGORY);
});

test('discarding an item removes it for good', async () => {
	await openItem('CAFE DE PRUEBA');
	await page.getByRole('button', { name: 'Descartar' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Descartar' }).click();
	await flash('Movimiento descartado.');
	await expect(rows().filter({ hasText: 'CAFE DE PRUEBA' })).toHaveCount(0);

	await syncNow(/Última sincronización/);
	await expect(rows().filter({ hasText: 'CAFE DE PRUEBA' })).toHaveCount(0);
	await expect(rows().filter({ hasText: '$1.235' })).toHaveCount(0);
});

test('a payout with an external reference is a payment at a merchant', async () => {
	await openItem('Pago en comercio');
	await expect(itemDate()).toContainText('19:43');
	await expect(page.getByRole('radio', { name: 'Gasto' })).toBeChecked();
});

test('approving a payout as a transfer moves both balances', async () => {
	const [mpBefore, secondBefore] = [await balanceOf('Mercado Pago'), await balanceOf(SECOND)];
	await openItem('Transferencia o retiro');
	await expect(itemDate()).toContainText('15:00');
	await expect(page.getByRole('radio', { name: 'Transf.' })).toBeChecked();
	await page.locator('input[name="description"]').fill(PAYOUT_DESC);
	await pick(page, 'Destino', SECOND);
	await page.getByRole('button', { name: 'Aprobar' }).click();
	await flash('Movimiento aprobado.');

	expect(await balanceOf('Mercado Pago')).toBe(mpBefore - 5000);
	expect(await balanceOf(SECOND)).toBe(secondBefore + 5000);
});

test('a learned kind rule suggests the other yield', async () => {
	// 7,89 renders as "$8"; the "Rendimientos" filter keeps the "$801" FAKE AMIGA row out.
	await openItem('Rendimientos', '$8');
	await page.locator('input[name="description"]').fill(YIELD_DESC);
	await page.getByRole('radio', { name: 'Ingreso' }).check({ force: true });
	await pick(page, 'Categoría', CATEGORY);
	await page.getByRole('button', { name: 'Aprobar' }).click();
	await flash('Movimiento aprobado.');
	await expect(rows().filter({ hasText: 'Rendimientos' })).toContainText(`Sugerido: ${CATEGORY}`);
});

test('bulk approve creates the suggested movements with exact amounts', async () => {
	const before = await balanceOf('Mercado Pago');
	await page.goto('/imports', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Aprobar 2 sugeridos' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Aprobar' }).click();
	await flash('Se aprobaron 2 movimientos.');
	// The merchant payout learned nothing from the transfer payout: it stays unsuggested.
	await expect(rows()).toHaveCount(2);
	await expect(rows().filter({ hasText: 'Ingreso de dinero' })).toHaveCount(1);
	await expect(rows().filter({ hasText: 'Pago en comercio' })).toHaveCount(1);

	const amounts: string[] = [];
	for (const desc of [AMIGA_DESC, YIELD_DESC]) {
		const hrefs = await findMovements(page, desc);
		expect(hrefs).toHaveLength(2);
		for (const href of hrefs) {
			await page.goto(`${href}/edit`, { waitUntil: 'networkidle' });
			amounts.push(await page.locator('input[name="amount"]').inputValue());
		}
	}
	expect(amounts.sort()).toEqual(['1.234,56', '17,36', '7,89', '800,50'].sort());

	// Whole-peso display: FAKE AMIGA 800,50 + yield 17,36 (the 7,89 one was approved before `before`).
	expect(Math.abs((await balanceOf('Mercado Pago')) - before - 817.86)).toBeLessThanOrEqual(1);

	await page.goto('/imports', { waitUntil: 'networkidle' });
	await expect(page.getByRole('button', { name: /sugerido/ })).toHaveCount(0);
});

test('other users get 404 and no Perfil row', async ({ browser }) => {
	for (const email of [OTHER_EMAIL, SEED_EMAIL]) {
		const ctx = await browser.newContext();
		const p = await ctx.newPage();
		await login(p, email);
		expect((await p.goto(`/imports/${pendingId}`))!.status()).toBe(404);
		expect((await p.goto('/imports'))!.status()).toBe(404);
		await p.goto('/profile', { waitUntil: 'networkidle' });
		await expect(p.getByRole('link', { name: /Mercado Pago/ })).toHaveCount(0);
		await ctx.close();
	}
});
