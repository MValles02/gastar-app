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
	pickDate,
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

const SYNCED = /^(Listo\.|Recién|Hace )/;

/** Clicks "Sincronizar" and reloads until the run is over (the lease is taken before the redirect). */
async function syncNow(expected = SYNCED) {
	await page.goto('/imports');
	await page.waitForLoadState('networkidle'); // hydration guard: the sync button is progressively enhanced
	// Wait for the action: once it answers, the lease is held and stale statuses can't match.
	await Promise.all([
		page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/imports')),
		page.getByRole('button', { name: 'Sincronizar' }).click()
	]);
	await expect(async () => {
		await page.reload();
		await expect(page.getByRole('status')).toHaveText(expected);
	}).toPass({ timeout: 30_000, intervals: [300, 500, 1000] });
}

/** Links Mercado Pago through the UI (fake OAuth) and picks the receiving account. */
async function link(p: Page, accountName: string) {
	await p.goto(MP_PATH);
	await p.getByRole('button', { name: 'Vincular Mercado Pago' }).click();
	await expect(p).toHaveURL(/\/profile\/mercado-pago\?linked=1$/);
	await p.waitForLoadState('networkidle'); // hydration guard: the account picker saves through JS
	await pick(p, 'Entra en', accountName);
	await expect(p.getByRole('button', { name: /Entra en/ })).toContainText(accountName);
}

const accountRow = async () => {
	await page.goto('/accounts');
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
	await page.goto('/accounts');
	const text = await page.getByRole('link', { name }).locator('.amount').first().textContent();
	return Number(text!.replace(/[^\d-]/g, ''));
};

const flash = (text: string) => expect(page.getByText(text)).toBeVisible();

/** Opens the review drawer of the pending item whose list row contains all `texts`. */
async function openItem(...texts: string[]) {
	await page.goto('/imports');
	await page.waitForLoadState('networkidle'); // hydration guard: the drawer is a shallow route opened by JS
	let row = rows();
	for (const t of texts) row = row.filter({ hasText: t });
	await row.getByRole('link').first().click();
	await expect(drawer()).toBeVisible();
	await expect(page).toHaveURL(/\/imports$/);
}

/** The review drawer (the topmost dialog once a picker is open). */
const drawer = () => page.getByRole('dialog', { name: 'Revisar movimiento' });
const approve = () => drawer().getByRole('button', { name: 'Aprobar', exact: true });

const rememberBox = () => page.getByRole('checkbox', { name: 'Recordar para la próxima' });

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
	test.setTimeout(90_000);
	const balance = await accountRow();
	const main = page.locator('main');
	const status = page.getByRole('status');

	// The report waits in MP's queue: payments land first, report items when it is processed.
	await fake('/__fake/report-delay', { ms: 15_000 });
	try {
		await page.goto('/imports');
		await page.waitForLoadState('networkidle'); // hydration guard: live progress needs JS
		// Survives only if the page is never reloaded.
		await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
		await page.getByRole('button', { name: 'Sincronizar' }).click();

		// While it runs the progress replaces the sync row, and nothing counts the new items yet.
		await expect(status).toContainText('Sincronizando');
		await expect(page.getByRole('button', { name: 'Sincronizar' })).toHaveCount(0);
		// Rows first: the payments phase can be slow under load.
		await expect(rows()).toHaveCount(4, { timeout: 30_000 });
		await expect(status).toContainText('Sincronizando');
		await expect(main.getByText('CAFE DE PRUEBA')).toBeVisible();
		await expect(rows().filter({ hasText: 'Rendimientos' })).toHaveCount(0);

		await expect(status).toHaveText('Listo. 8 movimientos nuevos.', { timeout: 40_000 });
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

	// First run: payments from the 30-day backfill; the report config only has its email list emptied.
	const [first] = await searchBegins();
	expect(Date.now() - first).toBeGreaterThan(29 * DAY_MS);
	expect((await calls()).filter((c) => c.path.includes('/config')).map((c) => c.method)).toEqual([
		'GET',
		'PUT'
	]);
	const puts = (await (await fake('/__fake/settlement-config-puts')).json()) as {
		seeded?: boolean;
		notification_email_list: string[];
	}[];
	expect(puts).toHaveLength(1);
	expect(puts[0].notification_email_list).toEqual([]);
	expect(puts[0].seeded).toBe(true);

	expect(await accountRow()).toBe(balance);

	await page.goto('/profile');
	await expect(page.getByRole('link', { name: /Mercado Pago/ })).toContainText('Vinculado');
});

test('a second sync searches from the last payment and keeps the same items', async () => {
	const before = await reportRequests();
	const configBefore = (await configRequests()).length;
	await syncNow();
	// The email list is already empty: only a GET, no PUT.
	expect((await configRequests()).slice(configBefore).map((c) => c.method)).toEqual(['GET']);
	expect(await reportRequests()).toBe(before + 1);
	await expect(rows()).toHaveCount(8);
	// The newest imported payment is 11 days old; the search restarts there minus 3 days of overlap.
	const age = Date.now() - (await searchBegins()).at(-1)!;
	expect(age).toBeGreaterThan(13 * DAY_MS);
	expect(age).toBeLessThan(15 * DAY_MS);
});

test('every MP call carries a token the fake issued, and no page shows it', async () => {
	const all = await calls();
	expect(all.length).toBeGreaterThan(0);
	// The fake answers 401 to any bearer it did not issue, so the syncs above prove the stored token works.
	for (const c of all) expect(c.authorization).toMatch(BEARER_RE);
	for (const path of [MP_PATH, '/imports', '/profile']) {
		await page.goto(path);
		expect(await page.content()).not.toContain('APP_USR');
	}
});

test('approving a payment keeps its exact cents, time of day and moves the balance', async () => {
	await page.goto('/categories/new');
	await page.locator('input[name="name"]').fill(CATEGORY);
	await page.getByRole('radio', { name: 'Ingresos' }).check({ force: true });
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/categories\/[0-9a-f-]{36}$/);
	categoryUrl = page.url();
	await page.goto('/accounts/new');
	await page.getByLabel('Nombre').fill(SECOND);
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	secondUrl = page.url();

	const before = await balanceOf('Mercado Pago');
	await openItem('FAKE AMIGA', '$1.235');
	await expect(drawer().getByText('FAKE AMIGA').first()).toBeVisible();
	// The time of day travels with the item.
	await expect(drawer().getByText(/10:15/)).toBeVisible();
	await expect(page.getByRole('radio', { name: 'Ingreso' })).toBeChecked();
	// The fixture names are padded with spaces; the prefilled title must be trimmed.
	await expect(page.locator('input[name="description"]')).toHaveValue('FAKE AMIGA');
	await page.locator('input[name="description"]').fill(AMIGA_DESC);
	await pick(page, 'Categoría', CATEGORY);
	await expect(rememberBox()).not.toBeChecked();
	await expect(page.getByText('Los próximos de FAKE AMIGA se completan así.')).toBeVisible();
	await rememberBox().check();
	await approve().click();
	await flash('Movimiento aprobado.');
	await expect(drawer()).toHaveCount(0);
	await expect(rows().filter({ hasText: '$1.235' })).toHaveCount(0);

	const [href] = await findMovements(page, AMIGA_DESC);
	expect(href).toMatch(MOVEMENT_DETAIL_RE);
	await page.goto(href);
	await expect(page.getByRole('button', { name: 'Monto: 1.234,56' })).toBeVisible();
	// Saving another field re-validates the whole movement: the stored cents must not be rejected.
	await page.getByRole('button', { name: `Descripción: ${AMIGA_DESC}` }).click();
	await page.getByRole('textbox', { name: 'Descripción' }).fill(`${AMIGA_DESC} editado`);
	await page.keyboard.press('Enter');
	await expect(page.getByText('Cambio guardado.')).toBeVisible();
	await expect(page.getByText('Los montos en pesos van sin decimales.')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Monto: 1.234,56' })).toBeVisible();
	await page.getByRole('button', { name: 'Deshacer' }).click();
	await expect(page.getByRole('button', { name: `Descripción: ${AMIGA_DESC}` })).toBeVisible();

	// Whole-peso display: the delta of the rounded balances is within a peso of the exact one.
	expect(Math.abs((await balanceOf('Mercado Pago')) - before - 1234.56)).toBeLessThanOrEqual(1);
});

test('a remembered rule suggests the category for the next item', async () => {
	await page.goto('/imports');
	const row = rows().filter({ hasText: 'FAKE AMIGA' });
	await expect(row).toHaveCount(1);
	await expect(row).toContainText(`${CATEGORY} · sugerido`);
	pendingId = (await row.getByRole('link').getAttribute('href'))!.split('/').pop()!;
	await row.getByRole('link').click();
	await expect(drawer()).toBeVisible();
	await expect(page.locator('input[name="description"]')).toHaveValue(AMIGA_DESC);
	await expect(page.getByRole('radio', { name: 'Ingreso' })).toBeChecked();
	await expect(page.getByRole('button', { name: /Categoría/ })).toContainText(CATEGORY);
	// Prefilled by a rule, the box still starts unchecked.
	await expect(rememberBox()).not.toBeChecked();
});

test('discarding an item removes it for good', async () => {
	await openItem('CAFE DE PRUEBA');
	await drawer().getByRole('button', { name: 'Descartar' }).click();
	await expect(page.getByRole('alertdialog')).toContainText('no vuelve a aparecer');
	await page.getByRole('alertdialog').getByRole('button', { name: 'Descartar' }).click();
	await flash('Movimiento descartado.');
	await expect(rows().filter({ hasText: 'CAFE DE PRUEBA' })).toHaveCount(0);

	await syncNow();
	await expect(rows().filter({ hasText: 'CAFE DE PRUEBA' })).toHaveCount(0);
	await expect(rows().filter({ hasText: '$1.235' })).toHaveCount(0);
});

test('approving a payout as a transfer moves both balances', async () => {
	const [mpBefore, secondBefore] = [await balanceOf('Mercado Pago'), await balanceOf(SECOND)];
	await openItem('Transferencia o retiro');
	await expect(drawer().getByText(/15:00/)).toBeVisible();
	await expect(page.getByRole('radio', { name: 'Transf.' })).toBeChecked();
	await expect(rememberBox()).toHaveCount(0);
	await page.locator('input[name="description"]').fill(PAYOUT_DESC);
	await pick(page, 'Destino', SECOND);
	await approve().click();
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
	await approve().click();
	await flash('Movimiento aprobado.');
	const other = rows().filter({ hasText: 'Rendimientos' });
	await expect(other).toHaveCount(1);
	await expect(other).not.toContainText('Sugerido');

	await openItem('Rendimientos');
	await expect(page.locator('input[name="description"]')).toHaveValue('Rendimientos');
	await expect(page.getByRole('button', { name: /Categoría/ })).not.toContainText(CATEGORY);
});

/** The pending-or-approved FAKE AMIGA item that still carries the remembered rule, and its movement. */
const amigaItem = () =>
	withDb(async (sql) => {
		const [item] = await sql`select id, status, movement_id from mp_import_items
			where user_id = (select id from "user" where email = ${IMPORT_EMAIL})
			and counterparty_nickname ilike '%FAKE AMIGA%' and amount = 80050`;
		const [m] = await sql`select count(*)::int as n from movements
			where description = ${AMIGA_DESC}
			and user_id = (select id from "user" where email = ${IMPORT_EMAIL})`;
		return { status: item.status as string, movementId: item.movement_id as string | null, n: m.n };
	});

const amigaItemId = () =>
	withDb(async (sql) => {
		const [item] = await sql`select id from mp_import_items
			where user_id = (select id from "user" where email = ${IMPORT_EMAIL})
			and counterparty_nickname ilike '%FAKE AMIGA%' and amount = 80050`;
		return item.id as string;
	});

/** Quick "Aprobar" on the suggested FAKE AMIGA row; the Deshacer toast stays up. */
async function quickApprove() {
	await page.goto('/imports');
	await page.waitForLoadState('networkidle'); // hydration guard: the quick approve is progressively enhanced
	await rows().filter({ hasText: 'FAKE AMIGA' }).getByRole('button', { name: 'Aprobar' }).click();
	await flash('Movimiento aprobado.');
	await expect(rows().filter({ hasText: 'FAKE AMIGA' })).toHaveCount(0);
}

test('quick approve creates the movement and Deshacer removes it and returns the item to pending', async () => {
	const before = await amigaItem();
	expect(before).toMatchObject({ status: 'pending', movementId: null });
	const balance = await balanceOf('Mercado Pago');

	await quickApprove();
	const approved = await amigaItem();
	expect(approved).toMatchObject({ status: 'approved', n: before.n + 1 });
	expect(approved.movementId).not.toBeNull();

	await page.getByRole('button', { name: 'Deshacer' }).click();
	await expect(rows().filter({ hasText: 'FAKE AMIGA' })).toHaveCount(1);
	expect(await amigaItem()).toEqual(before);
	expect(await balanceOf('Mercado Pago')).toBe(balance);
});

test('Deshacer of a quick approve fails and keeps everything when the movement was edited meanwhile', async () => {
	const before = await amigaItem();
	await quickApprove();
	const { movementId } = await amigaItem();
	// An edit stamps updated_at: move it away from created_at the way updateMovement would.
	await withDb(
		(sql) => sql`update movements set updated_at = created_at + interval '1 minute'
			where id = ${movementId}`
	);
	await page.getByRole('button', { name: 'Deshacer' }).click();
	await expect(page.getByText('No se pudo deshacer.')).toBeVisible();
	expect(await amigaItem()).toMatchObject({ status: 'approved', movementId, n: before.n + 1 });

	// Put it back as it was (movement unedited) and undo through the action, ending where we began.
	await withDb((sql) => sql`update movements set updated_at = created_at where id = ${movementId}`);
	const res = await page.request.post('/imports?/undoApprove', {
		headers: { origin, accept: 'application/json' },
		form: { id: await amigaItemId() }
	});
	expect(await res.text()).toContain('"success"');
	expect(await amigaItem()).toEqual(before);
});

test('bulk approve creates the suggested movements with exact amounts', async () => {
	const before = await balanceOf('Mercado Pago');
	await page.goto('/imports');
	await page.waitForLoadState('networkidle'); // hydration guard: the bulk confirm dialog needs JS
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
			await page.goto(href);
			const label = await page.getByRole('button', { name: /^Monto: / }).getAttribute('aria-label');
			amounts.push(label!.replace('Monto: ', ''));
		}
	}
	expect(amounts.sort()).toEqual(['1.234,56', '7,89', '800,50'].sort());

	// Whole-peso display: only FAKE AMIGA 800,50 (the 7,89 yield was approved before `before`).
	expect(Math.abs((await balanceOf('Mercado Pago')) - before - 800.5)).toBeLessThanOrEqual(1);

	await page.goto('/imports');
	await expect(page.getByRole('button', { name: /sugerido/ })).toHaveCount(0);
});

const daysAgoYmd = (n: number) =>
	new Date(Date.now() - 3 * 3_600_000 - n * DAY_MS).toISOString().slice(0, 10);
const reportBegins = async () => (await (await fake('/__fake/report-begins')).json()) as string[];

/** Runs `fn` against the importer's rows in mp_import_items / mp_sync_state. */
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
const itemRows = () =>
	withDb(
		(sql) => sql`select external_key, status from mp_import_items
			where user_id = (select id from "user" where email = ${IMPORT_EMAIL}) order by external_key`
	);
const syncedUntil = () =>
	withDb(async (sql) => {
		const [r] = await sql`select synced_until from mp_sync_state
			where account_id = (select account_id from mp_connections
				where user_id = (select id from "user" where email = ${IMPORT_EMAIL}))`;
		return (r.synced_until as Date).getTime();
	});

/** Sets "Importar desde" to `ymd` in the Mercado Pago settings; the picker saves on its own. */
async function importFrom(ymd: string) {
	await page.goto(MP_PATH);
	await page.waitForLoadState('networkidle'); // hydration guard: the date picker is JS-only
	await pickDate(page, 'Importar desde', ymd);
	await expect(page.getByText('Cambio guardado.')).toBeVisible();
}

const lastRunAt = () =>
	withDb(async (sql) => {
		const [r] = await sql`select last_run_at from mp_sync_state
			where account_id = (select account_id from mp_connections
				where user_id = (select id from "user" where email = ${IMPORT_EMAIL}))`;
		return (r.last_run_at as Date).getTime();
	});

/** Runs `start`, then waits for the sync it kicked off to finish (last_run_at moves). */
async function untilRun(start: () => Promise<unknown>) {
	const prev = await lastRunAt();
	await start();
	await expect
		.poll(lastRunAt, { timeout: 30_000, intervals: [300, 500, 1000] })
		.toBeGreaterThan(prev);
}

test('moving "Importar desde" earlier searches from the chosen date, keeps synced_until and never changes approved or rejected items', async () => {
	const from = daysAgoYmd(60);
	const until = await syncedUntil();
	const searchesBefore = (await searchBegins()).length;
	const reportsBefore = (await reportBegins()).length;
	// Drop the pending items so the backfill visibly brings them back.
	await withDb(
		(sql) => sql`delete from mp_import_items where status = 'pending'
		and user_id = (select id from "user" where email = ${IMPORT_EMAIL})`
	);

	await untilRun(() => importFrom(from));
	await page.goto('/imports');
	await expect(rows()).toHaveCount(3);

	const begin = (await searchBegins())[searchesBefore];
	expect(new Date(begin - 3 * 3_600_000).toISOString().slice(0, 10)).toBe(from);
	// Reports go in 31-day chunks: the first starts on the chosen local day (03:00Z).
	expect((await reportBegins())[reportsBefore]).toBe(`${from}T03:00:00Z`);
	expect(await syncedUntil()).toBe(until);

	// Earlier still: a backfill again, and approved or rejected items stay as they were.
	const decided = await itemRows();
	expect(decided.filter((r) => r.status === 'approved').length).toBeGreaterThan(0);
	expect(decided.filter((r) => r.status === 'rejected').length).toBeGreaterThan(0);
	await untilRun(() => importFrom(daysAgoYmd(90)));
	expect(await itemRows()).toEqual(decided);
	await page.goto('/imports');
	await expect(rows()).toHaveCount(3);
	await page.goto(MP_PATH);
	await expect(page.locator('input[name="from"]')).toHaveValue(daysAgoYmd(90));
});

test('moving "Importar desde" later removes older pending items and the next sync never searches before it', async () => {
	const today = daysAgoYmd(0);
	const todayStart = Date.parse(`${today}T03:00:00Z`);
	const before = await itemRows();
	const decided = (rs: typeof before) => rs.filter((r) => r.status !== 'pending');

	await importFrom(today);
	await expect(page.locator('input[name="from"]')).toHaveValue(today);

	// Pending items stamped before today are gone; approved and rejected rows are untouched.
	await expect
		.poll(async () => {
			const [r] = await withDb(
				(sql) => sql`select count(*)::int as n from mp_import_items
					where status = 'pending' and occurred_at < ${new Date(todayStart)}
					and user_id = (select id from "user" where email = ${IMPORT_EMAIL})`
			);
			return r.n;
		})
		.toBe(0);
	expect(decided(await itemRows())).toEqual(decided(before));

	const searches = (await searchBegins()).length;
	const reports = (await reportBegins()).length;
	await untilRun(async () => {
		await page.goto('/imports');
		await page.waitForLoadState('networkidle'); // hydration guard: the sync button is progressively enhanced
		await page.getByRole('button', { name: 'Sincronizar' }).click();
	});
	expect((await searchBegins()).slice(searches).every((b) => b >= todayStart)).toBe(true);
	expect((await searchBegins()).length).toBeGreaterThan(searches);
	expect((await reportBegins()).slice(reports).every((b) => Date.parse(b) >= todayStart)).toBe(
		true
	);

	// Put the window back so the tests below see the older items again.
	await untilRun(() => importFrom(daysAgoYmd(60)));
	await page.reload();
	await expect(page.locator('input[name="from"]')).toHaveValue(daysAgoYmd(60));
});

test('a date out of range is refused and starts no sync', async () => {
	const searches = (await searchBegins()).length;
	for (const [ymd, message] of [
		[daysAgoYmd(366), 'Podés traer hasta 12 meses para atrás.'],
		[daysAgoYmd(-2), 'Elegí una fecha válida.']
	]) {
		// The calendar cannot reach these days: post the action the way the picker would.
		const res = await page.request.post(`${MP_PATH}?/importFrom`, {
			headers: { origin, accept: 'application/json' },
			form: { from: ymd }
		});
		const body = await res.text();
		expect(body).toContain('"failure"');
		expect(body).toContain(message);
	}
	expect((await searchBegins()).length).toBe(searches);
});

/** A fresh signed-in session for another seeded user. */
async function asUser(browser: Browser, email: string) {
	const ctx = await browser.newContext();
	const p = await ctx.newPage();
	await login(p, email);
	return { ctx, p };
}

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

test('the receiving account must be an active ARS account of the user', async ({ browser }) => {
	await page.goto('/accounts/new');
	await page.getByLabel('Nombre').fill(`Cuenta USD ${sfx}`);
	await page.getByRole('radio', { name: 'Dólares' }).check({ force: true });
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	usdUrl = page.url();
	const usdId = usdUrl.split('/').pop()!;

	const { ctx, p } = await asUser(browser, OTHER_EMAIL);
	await p.goto('/accounts');
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
	await page.goto(MP_PATH);
	await expect(page.getByRole('button', { name: /Entra en/ })).toContainText('Mercado Pago');
});

test('an expired token is refreshed silently and the sync still works', async () => {
	const tokens = async () => new Set((await calls()).map((c) => c.authorization));
	const before = await tokens();
	await fake('/__fake/expire', {});
	await syncNow();
	const after = await tokens();
	expect([...after].filter((t) => !before.has(t))).not.toHaveLength(0);
	await expect(page.getByRole('status')).not.toContainText('No se pudo sincronizar');
	await expect(page.getByRole('button', { name: 'Sincronizar' })).toBeVisible();
});

test('a revoked connection asks to reconnect in Perfil and in the inbox', async () => {
	await fake('/__fake/revoke', {});
	await page.goto('/imports');
	await Promise.all([
		page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/imports')),
		page.getByRole('button', { name: 'Sincronizar' }).click()
	]);
	await expect(async () => {
		await page.reload();
		await expect(page.getByRole('link', { name: 'Reconectar' })).toBeVisible();
	}).toPass({ timeout: 30_000, intervals: [300, 500, 1000] });
	await expect(page.getByRole('button', { name: 'Sincronizar' })).toHaveCount(0);
	await expect(page.getByRole('status')).toContainText('volver a vincular');
	// The items already imported stay listed.
	await expect(rows().first()).toBeVisible();

	await page.goto('/profile');
	await expect(page.getByRole('link', { name: /Mercado Pago/ })).toContainText('Reconectar');
	await page.goto(MP_PATH);
	await expect(page.getByRole('button', { name: 'Reconectar' })).toBeVisible();
});

test('another user links their own account and sees only their own inbox', async ({ browser }) => {
	const { ctx, p } = await asUser(browser, OTHER_EMAIL);
	try {
		await link(p, 'Otra cuenta pesos');
		await p.goto('/imports');
		await p.waitForLoadState('networkidle'); // hydration guard: the sync button is progressively enhanced
		await Promise.all([
			p.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/imports')),
			p.getByRole('button', { name: 'Sincronizar' }).click()
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

/** Links `otro`, syncs once and returns the status text once the run is over; cleans up like its siblings. */
async function otherSync(browser: Browser, expected: RegExp) {
	const { ctx, p } = await asUser(browser, OTHER_EMAIL);
	try {
		await link(p, 'Otra cuenta pesos');
		await p.goto('/imports');
		await Promise.all([
			p.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/imports')),
			p.getByRole('button', { name: 'Sincronizar' }).click()
		]);
		await expect(async () => {
			await p.reload();
			await expect(p.getByRole('status')).toHaveText(expected);
		}).toPass({ timeout: 30_000, intervals: [300, 500, 1000] });
		return await p.locator('[data-slot="item-group"] [role="listitem"]').count();
	} finally {
		await p.request.post('/dev/mp-reset', { headers: { origin } });
		await ctx.close();
	}
}

const configRequests = async () => (await calls()).filter((c) => c.path.endsWith('/config'));
// Every column the settlement CSV parser reads.
const PARSER_COLUMNS = [
	'EXTERNAL_REFERENCE',
	'SOURCE_ID',
	'PAYMENT_METHOD',
	'TRANSACTION_TYPE',
	'TRANSACTION_AMOUNT',
	'TRANSACTION_DATE',
	'SETTLEMENT_NET_AMOUNT'
];

test('an account without a report configuration gets one created and syncs', async ({
	browser
}) => {
	await fake('/__fake/settlement-config', { configured: false });
	try {
		const items = await otherSync(browser, SYNCED);
		expect(items).toBe(8);
	} finally {
		await fake('/__fake/settlement-config', { configured: true });
	}
	const posts = (await (await fake('/__fake/settlement-config')).json()) as {
		include_withdraw: boolean;
		columns: { key: string }[];
		notification_email_list: string[];
	}[];
	expect(posts).toHaveLength(1);
	expect(posts[0].include_withdraw).toBe(true);
	expect(posts[0].columns.map((c) => c.key)).toEqual(expect.arrayContaining(PARSER_COLUMNS));
	expect(posts[0].notification_email_list).toEqual([]);
	// The silencing GET and the create's own GET both 404; then the config is created.
	expect((await configRequests()).slice(-3).map((c) => c.method)).toEqual(['GET', 'GET', 'POST']);
});

test('an existing report configuration is only changed to empty its email list when the report still 404s', async ({
	browser
}) => {
	const before = (await configRequests()).length;
	await fake('/__fake/settlement-config', { configured: true, createStays404: true });
	try {
		await otherSync(browser, /^No se pudo sincronizar/);
	} finally {
		await fake('/__fake/settlement-config', { configured: true });
	}
	const methods = (await configRequests()).slice(before).map((c) => c.method);
	expect(methods).not.toContain('POST');
	expect(methods.filter((m) => m === 'PUT').length).toBeLessThanOrEqual(1);
});

test('disconnecting removes the link and the inbox asks to link again', async () => {
	await page.goto(MP_PATH);
	await page.waitForLoadState('networkidle'); // hydration guard: the disconnect confirm dialog needs JS
	await page.getByRole('button', { name: 'Desvincular' }).click();
	await expect(page.getByRole('alertdialog')).toContainText('revocar el acceso');
	await page.getByRole('alertdialog').getByRole('button', { name: 'Desvincular' }).click();
	await expect(page.getByRole('button', { name: 'Vincular Mercado Pago' })).toBeVisible();

	await page.goto('/imports');
	await expect(page).toHaveURL(new RegExp(`${MP_PATH}$`));
	await page.goto('/profile');
	await expect(page.getByRole('link', { name: /Mercado Pago/ })).toContainText('Vincular');
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
