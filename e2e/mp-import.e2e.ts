import { expect, test, type Browser, type Page } from '@playwright/test';
import postgres from 'postgres';
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
const BEARER_RE = /^Bearer APP_USR-fake-\d+$/;
const MP_PATH = '/profile/mercado-pago';
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

/** Links Mercado Pago through the UI (fake OAuth) and picks the receiving account. */
async function link(p: Page, accountName: string) {
	await p.goto(MP_PATH, { waitUntil: 'networkidle' });
	await p.getByRole('button', { name: 'Vincular Mercado Pago' }).click();
	await expect(p).toHaveURL(/\/profile\/mercado-pago\?linked=1$/);
	await p.waitForLoadState('networkidle');
	await p.getByLabel('Cuenta que recibe los movimientos').selectOption({ label: accountName });
	await p.getByRole('button', { name: 'Guardar' }).click();
	await expect(p.getByRole('link', { name: 'Ver movimientos' })).toBeVisible();
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
let usdUrl = '';
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

const rememberBox = () => page.getByRole('checkbox', { name: 'Recordar para la próxima' });

/** The read-only "Fecha" of the open item. */
const itemDate = () => page.locator('dt', { hasText: 'Fecha' }).locator('+ dd');

test.beforeAll(async ({ browser }) => {
	await fake('/__fake/reset', {});
	page = await browser.newPage();
	await login(page, IMPORT_EMAIL);
	origin = new URL(page.url()).origin;
	const res = await page.request.post('/dev/mp-reset', { headers: { origin } });
	expect(res.status()).toBe(204);
	await link(page, 'Mercado Pago');
});

test.afterAll(async () => {
	for (const d of [AMIGA_DESC, PAYOUT_DESC, YIELD_DESC]) await deleteMovements(page, origin, d);
	for (const url of [usdUrl, secondUrl, categoryUrl]) if (url) await postDelete(page, origin, url);
	await page.close();
});

test('sync shows live progress, fills the inbox without a reload and leaves balances alone', async () => {
	const balance = await accountRow();
	const main = page.locator('main');
	const status = page.getByRole('status');

	// The report waits in MP's queue: payments land first, report items when it is processed.
	await fake('/__fake/report-delay', { ms: 6000 });
	try {
		await page.goto('/imports', { waitUntil: 'networkidle' });
		// Survives only if the page is never reloaded.
		await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
		await page.getByRole('button', { name: 'Sincronizar ahora' }).click();

		await expect(status).toContainText('Esperando el reporte de Mercado Pago');
		await expect(status).toContainText('4 movimientos nuevos');
		await expect(rows()).toHaveCount(4);
		await expect(main.getByText('CAFE DE PRUEBA')).toBeVisible();
		await expect(rows().filter({ hasText: 'Rendimientos' })).toHaveCount(0);

		await expect(status).toContainText('Listo. Última sincronización', { timeout: 20_000 });
		await expect(status).toContainText('8 movimientos nuevos');
		await expect(rows()).toHaveCount(8);
		expect(
			await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)
		).toBe(true);
	} finally {
		await fake('/__fake/report-delay', { ms: 0 });
	}
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

test('every MP call carries a token the fake issued, and no page shows it', async () => {
	const all = await calls();
	expect(all.length).toBeGreaterThan(0);
	// The fake answers 401 to any bearer it did not issue, so the syncs above prove the stored token works.
	for (const c of all) expect(c.authorization).toMatch(BEARER_RE);
	for (const path of [MP_PATH, '/imports', '/profile']) {
		await page.goto(path, { waitUntil: 'networkidle' });
		expect(await page.content()).not.toContain('APP_USR');
	}
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
	await expect(rememberBox()).not.toBeChecked();
	await expect(page.getByText('Los próximos de FAKE AMIGA se completan así.')).toBeVisible();
	await rememberBox().check();
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

test('a remembered rule suggests the category for the next item', async () => {
	await page.goto('/imports', { waitUntil: 'networkidle' });
	const row = rows().filter({ hasText: 'FAKE AMIGA' });
	await expect(row).toHaveCount(1);
	await expect(row).toContainText(`Sugerido: ${CATEGORY}`);
	await row.getByRole('link').click();
	pendingId = new URL(page.url()).pathname.split('/').pop()!;
	await expect(page.locator('input[name="description"]')).toHaveValue(AMIGA_DESC);
	await expect(page.getByRole('radio', { name: 'Ingreso' })).toBeChecked();
	await expect(page.getByRole('button', { name: /Categoría/ })).toContainText(CATEGORY);
	// Prefilled by a rule, the box still starts unchecked.
	await expect(rememberBox()).not.toBeChecked();
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
	// No merchant: nothing stable to remember.
	await expect(rememberBox()).toHaveCount(0);
});

test('approving a payout as a transfer moves both balances', async () => {
	const [mpBefore, secondBefore] = [await balanceOf('Mercado Pago'), await balanceOf(SECOND)];
	await openItem('Transferencia o retiro');
	await expect(itemDate()).toContainText('15:00');
	await expect(page.getByRole('radio', { name: 'Transf.' })).toBeChecked();
	await expect(rememberBox()).toHaveCount(0);
	await page.locator('input[name="description"]').fill(PAYOUT_DESC);
	await pick(page, 'Destino', SECOND);
	await page.getByRole('button', { name: 'Aprobar' }).click();
	await flash('Movimiento aprobado.');

	expect(await balanceOf('Mercado Pago')).toBe(mpBefore - 5000);
	expect(await balanceOf(SECOND)).toBe(secondBefore + 5000);
});

test('approving without remembering leaves the other yield unsuggested', async () => {
	// 7,89 renders as "$8"; the "Rendimientos" filter keeps the "$801" FAKE AMIGA row out.
	await openItem('Rendimientos', '$8');
	await page.locator('input[name="description"]').fill(YIELD_DESC);
	await page.getByRole('radio', { name: 'Ingreso' }).check({ force: true });
	await pick(page, 'Categoría', CATEGORY);
	await expect(page.getByText('Los próximos de Rendimientos se completan así.')).toBeVisible();
	await expect(rememberBox()).not.toBeChecked();
	await page.getByRole('button', { name: 'Aprobar' }).click();
	await flash('Movimiento aprobado.');
	const other = rows().filter({ hasText: 'Rendimientos' });
	await expect(other).toHaveCount(1);
	await expect(other).not.toContainText('Sugerido');

	await openItem('Rendimientos');
	await expect(page.locator('input[name="description"]')).toHaveValue('Rendimientos');
	await expect(page.getByRole('button', { name: /Categoría/ })).not.toContainText(CATEGORY);
});

test('bulk approve creates the suggested movements with exact amounts', async () => {
	const before = await balanceOf('Mercado Pago');
	await page.goto('/imports', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Aprobar 1 sugerido' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Aprobar' }).click();
	await flash('Se aprobó 1 movimiento.');
	// Only the remembered counterparty was suggested; the payouts never offered a rule.
	await expect(rows()).toHaveCount(3);
	await expect(rows().filter({ hasText: 'Ingreso de dinero' })).toHaveCount(1);
	await expect(rows().filter({ hasText: 'Pago en comercio' })).toHaveCount(1);
	await expect(rows().filter({ hasText: 'Rendimientos' })).toHaveCount(1);

	const amounts: string[] = [];
	for (const [desc, count] of [
		[AMIGA_DESC, 2],
		[YIELD_DESC, 1]
	] as const) {
		const hrefs = await findMovements(page, desc);
		expect(hrefs).toHaveLength(count);
		for (const href of hrefs) {
			await page.goto(`${href}/edit`, { waitUntil: 'networkidle' });
			amounts.push(await page.locator('input[name="amount"]').inputValue());
		}
	}
	expect(amounts.sort()).toEqual(['1.234,56', '7,89', '800,50'].sort());

	// Whole-peso display: only FAKE AMIGA 800,50 (the 7,89 yield was approved before `before`).
	expect(Math.abs((await balanceOf('Mercado Pago')) - before - 800.5)).toBeLessThanOrEqual(1);

	await page.goto('/imports', { waitUntil: 'networkidle' });
	await expect(page.getByRole('button', { name: /sugerido/ })).toHaveCount(0);
});

/** A fresh signed-in session for another seeded user. */
async function asUser(browser: Browser, email: string) {
	const ctx = await browser.newContext();
	const p = await ctx.newPage();
	await login(p, email);
	return { ctx, p };
}

test('denying access on Mercado Pago leaves the account unlinked', async ({ browser }) => {
	const { ctx, p } = await asUser(browser, OTHER_EMAIL);
	await fake('/__fake/oauth', { deny: true });
	try {
		await p.goto(MP_PATH, { waitUntil: 'networkidle' });
		await p.getByRole('button', { name: 'Vincular Mercado Pago' }).click();
		await expect(p).toHaveURL(/error=denied/);
		await expect(p.getByText('Cancelaste la vinculación.')).toBeVisible();
		await expect(p.getByRole('button', { name: 'Vincular Mercado Pago' })).toBeVisible();
	} finally {
		await fake('/__fake/oauth', { deny: false });
		await ctx.close();
	}
});

test('a callback with a tampered state is rejected', async ({ browser }) => {
	const { ctx, p } = await asUser(browser, OTHER_EMAIL);
	try {
		// Starts a real linking (the browser gets the state cookie) but never follows it to Mercado Pago:
		// the callback then arrives with a state this browser was never given.
		const start = await p.request.post(`${MP_PATH}?/connect`, {
			headers: { origin },
			form: {},
			maxRedirects: 0
		});
		expect(start.ok()).toBe(true);
		await p.goto(`${MP_PATH}/callback?code=TG-forged&state=tampered`);
		await expect(p).toHaveURL(/error=state/);
		await expect(p.getByText('La vinculación venció. Probá de nuevo.')).toBeVisible();
		await expect(p.getByRole('button', { name: 'Vincular Mercado Pago' })).toBeVisible();
	} finally {
		await ctx.close();
	}
});

test('a failing token endpoint shows the exchange error', async ({ browser }) => {
	const { ctx, p } = await asUser(browser, OTHER_EMAIL);
	await fake('/__fake/token-fail', { fail: true });
	try {
		await p.goto(MP_PATH, { waitUntil: 'networkidle' });
		await p.getByRole('button', { name: 'Vincular Mercado Pago' }).click();
		await expect(p).toHaveURL(/error=exchange/);
		await expect(p.getByText('Mercado Pago no respondió. Probá de nuevo.')).toBeVisible();
		await expect(p.getByRole('button', { name: 'Vincular Mercado Pago' })).toBeVisible();
	} finally {
		await fake('/__fake/token-fail', { fail: false });
		await ctx.close();
	}
});

test('the receiving account must be an active ARS account of the user', async ({ browser }) => {
	await page.goto('/accounts/new', { waitUntil: 'networkidle' });
	await page.getByLabel('Nombre').fill(`Cuenta USD ${sfx}`);
	await page.getByRole('radio', { name: 'USD' }).check({ force: true });
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	usdUrl = page.url();
	const usdId = usdUrl.split('/').pop()!;

	const { ctx, p } = await asUser(browser, OTHER_EMAIL);
	await p.goto('/accounts', { waitUntil: 'networkidle' });
	const otherHref = await p.getByRole('link', { name: /Otra cuenta pesos/ }).getAttribute('href');
	await ctx.close();
	const otherId = otherHref!.split('/').pop()!;

	for (const accountId of [otherId, usdId]) {
		// A form post without JS gets the page back; asking for JSON exposes the action's own result.
		const res = await page.request.post(`${MP_PATH}?/account`, {
			headers: { origin, accept: 'application/json' },
			form: { accountId }
		});
		expect(await res.json()).toMatchObject({ type: 'failure', status: 400 });
	}
	await page.goto(MP_PATH, { waitUntil: 'networkidle' });
	await expect(
		page.getByLabel('Cuenta que recibe los movimientos').locator('option:checked')
	).toHaveText('Mercado Pago');
});

test('an expired token is refreshed silently and the sync still works', async () => {
	const tokens = async () => new Set((await calls()).map((c) => c.authorization));
	const before = await tokens();
	await fake('/__fake/expire', {});
	await syncNow(/Listo\. Última sincronización/);
	const after = await tokens();
	expect([...after].filter((t) => !before.has(t))).not.toHaveLength(0);
	await expect(page.getByRole('status')).not.toContainText('No se pudo sincronizar');
	await expect(page.getByRole('button', { name: 'Sincronizar ahora' })).toBeVisible();
});

test('a revoked connection asks to reconnect in Perfil and in the inbox', async () => {
	await fake('/__fake/revoke', {});
	await page.goto('/imports', { waitUntil: 'networkidle' });
	await Promise.all([
		page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/imports')),
		page.getByRole('button', { name: 'Sincronizar ahora' }).click()
	]);
	await expect(async () => {
		await page.reload();
		await expect(page.getByRole('link', { name: 'Reconectar' })).toBeVisible();
	}).toPass({ timeout: 30_000, intervals: [300, 500, 1000] });
	await expect(page.getByRole('button', { name: 'Sincronizar ahora' })).toHaveCount(0);
	await expect(page.getByRole('status')).toContainText('volver a vincular');
	// The items already imported stay listed.
	await expect(rows().first()).toBeVisible();

	await page.goto('/profile', { waitUntil: 'networkidle' });
	await expect(page.getByRole('link', { name: /Mercado Pago/ })).toContainText('Reconectar');
	await page.goto(MP_PATH, { waitUntil: 'networkidle' });
	await expect(page.getByRole('button', { name: 'Reconectar' })).toBeVisible();
});

test('another user links their own account and sees only their own inbox', async ({ browser }) => {
	const { ctx, p } = await asUser(browser, OTHER_EMAIL);
	try {
		await link(p, 'Otra cuenta pesos');
		await p.getByRole('link', { name: 'Ver movimientos' }).click();
		await expect(p).toHaveURL(/\/imports$/);
		await p.waitForLoadState('networkidle');
		await Promise.all([
			p.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/imports')),
			p.getByRole('button', { name: 'Sincronizar ahora' }).click()
		]);
		const theirs = p.locator('[data-slot="item-group"] [role="listitem"]');
		// Their own full import (the fake serves the same payments), not the importer's current inbox.
		await expect(theirs).toHaveCount(8, { timeout: 30_000 });
		expect((await p.goto(`/imports/${pendingId}`))!.status()).toBe(404);
	} finally {
		// Leave `otro` as the other specs expect: no items, no connection.
		await p.request.post('/dev/mp-reset', { headers: { origin } });
		await ctx.close();
	}
});

test('a stored token that cannot be decrypted asks to reconnect', async ({ browser }) => {
	const { ctx, p } = await asUser(browser, OTHER_EMAIL);
	const sql = postgres(
		process.env.DATABASE_URL || 'postgres://gastar:gastar@localhost:5432/gastar'
	);
	try {
		await link(p, 'Otra cuenta pesos');
		// Same effect as a rotated MP_TOKEN_KEY: the ciphertext no longer opens.
		await sql`update mp_connections set access_token = 'v1:AAAA'
			where user_id = (select id from "user" where email = ${OTHER_EMAIL})`;
		await p.goto('/imports', { waitUntil: 'networkidle' });
		await Promise.all([
			p.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/imports')),
			p.getByRole('button', { name: 'Sincronizar ahora' }).click()
		]);
		await expect(async () => {
			await p.reload();
			await expect(p.getByRole('link', { name: 'Reconectar' })).toBeVisible();
		}).toPass({ timeout: 30_000, intervals: [300, 500, 1000] });
		await p.goto('/profile', { waitUntil: 'networkidle' });
		await expect(p.getByRole('link', { name: /Mercado Pago/ })).toContainText('Reconectar');
	} finally {
		await sql.end();
		await p.request.post('/dev/mp-reset', { headers: { origin } });
		await ctx.close();
	}
});

test('disconnecting removes the link and the inbox asks to link again', async () => {
	await page.goto(MP_PATH, { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Desvincular' }).click();
	await expect(page.getByRole('alertdialog')).toContainText('revocar el acceso');
	await page.getByRole('alertdialog').getByRole('button', { name: 'Desvincular' }).click();
	await expect(page.getByRole('button', { name: 'Vincular Mercado Pago' })).toBeVisible();

	await page.goto('/imports', { waitUntil: 'networkidle' });
	await expect(page).toHaveURL(new RegExp(`${MP_PATH}$`));
	await page.goto('/profile', { waitUntil: 'networkidle' });
	await expect(page.getByRole('link', { name: /Mercado Pago/ })).toContainText('Sin vincular');
});

test('users without a connection are sent to link and cannot open others items', async ({
	browser
}) => {
	for (const email of [OTHER_EMAIL, SEED_EMAIL]) {
		const { ctx, p } = await asUser(browser, email);
		expect((await p.goto(`/imports/${pendingId}`))!.status()).toBe(404);
		await p.goto('/imports');
		await expect(p).toHaveURL(new RegExp(`${MP_PATH}$`));
		await expect(p.getByRole('button', { name: 'Vincular Mercado Pago' })).toBeVisible();
		await ctx.close();
	}
});
