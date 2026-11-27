// Shared constants and steps for the E2E specs.
import {
	expect,
	type APIRequestContext,
	type Browser,
	type Locator,
	type Page
} from '@playwright/test';
import postgres from 'postgres';
import { es } from '../src/lib/copy/es';
import {
	DEFAULT_SEED_EMAIL,
	DEFAULT_SEED_PASSWORD,
	OTHER_EMAIL
} from '../scripts/lib/seed-identities.js';
import { appDay, FAKE_GMAIL } from './fakes.js';
import { waitForLink } from './outbox';

// Same defaults as scripts/seed.js (local demo users, not secrets), shared via scripts/lib/seed-identities.js.
// Other seeded users, same password:
// - OTHER_EMAIL: ARS "Otra cuenta pesos", category "Ajena", USD rule "Regla ajena".
// - IMPORT_EMAIL: owner of the Mercado Pago import account.
// - GALICIA_EMAIL: ARS "Caja pesos" and USD "Caja dólares", for the Banco Galicia statements.
// - ALERTS_EMAIL: ARS "Pesos Visa A", USD "Dolares Visa A", expense category "Compras Visa" (gmail-alerts.e2e.ts only).
// - ALERTS_B_EMAIL: ARS "Pesos Visa B" (gmail-alerts.e2e.ts only).
// - CARD_EMAIL: ARS "Pesos Tarjeta", USD "Dolares Tarjeta", expense category "Compras Tarjeta" (card-matching.e2e.ts only).
export { OTHER_EMAIL };
export {
	IMPORT_EMAIL,
	GALICIA_EMAIL,
	ALERTS_EMAIL,
	ALERTS_B_EMAIL,
	CARD_EMAIL
} from '../scripts/lib/seed-identities.js';
export const SEED_EMAIL = process.env.SEED_EMAIL || DEFAULT_SEED_EMAIL;
const SEED_PASSWORD = process.env.SEED_PASSWORD || DEFAULT_SEED_PASSWORD;

export const PHONE = { width: 390, height: 844 };

/** A movement detail URL (no trailing path). */
export const MOVEMENT_DETAIL_RE = /\/movements\/[0-9a-f-]{36}$/;

export const WHOLE_PESOS_ERROR = es.common.amount.arsWhole;

/** Today in the app time zone, as YYYY-MM-DD. */
export const todayInAppTz = () => appDay(Date.now());

/**
 * Waits until the current document has hydrated: the root layout sets `data-hydrated` on <html> once
 * it mounts. Use it before a JS-only control (drawer, picker, enhanced form) after a full page load.
 * Returns at once without JavaScript, where nothing hydrates.
 */
export async function waitForHydration(page: Page) {
	if (await page.evaluate(() => matchMedia('(scripting: none)').matches)) return;
	await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
}

/** Opens `url` and waits for hydration (see `waitForHydration`). */
export async function gotoHydrated(page: Page, url: string) {
	await page.goto(url);
	await waitForHydration(page);
}

/** Fills and submits the login form without checking the outcome. */
export async function submitLogin(page: Page, email: string, password = SEED_PASSWORD) {
	await gotoHydrated(page, '/login');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Contraseña', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Ingresar' }).click();
}

/**
 * Signs up a fresh user, follows the verification link (which signs them in) and waits for Inicio.
 * The e2e build allows 50 sign-ups/hour/IP (production: 10). One full run makes 12 (signup 3,
 * plan-recurring-suggestions 2, google-sign-in 2, plan-pages 1, profile 1, plan-budget 1,
 * recurring-link 1, reportes 1).
 * New specs must still reuse one user per file (sign up in `beforeAll`).
 */
export async function signUpVerified(
	page: Page,
	request: APIRequestContext,
	o: { email: string; password: string; name: string }
) {
	await gotoHydrated(page, '/signup');
	await page.getByLabel('Nombre').fill(o.name);
	await page.getByLabel('Email').fill(o.email);
	await page.getByLabel('Contraseña', { exact: true }).fill(o.password);
	await page.getByRole('button', { name: 'Crear cuenta' }).click();
	await expect(page.getByRole('heading', { name: 'Revisá tu email' })).toBeVisible();
	await page.goto((await waitForLink(request, o.email, /Confirmá/)).link);
	await expect(page).toHaveURL(/\/$/);
}

/** Logs a seeded user in and waits for Inicio. */
export async function login(page: Page, email = SEED_EMAIL) {
	await submitLogin(page, email);
	await expect(page).toHaveURL(/\/$/);
}

/** Sets the currency cookie Inicio, Plan and Reportes read. */
export const setCurrencyCookie = (page: Page, baseURL: string, value: string) =>
	page.context().addCookies([{ name: 'currency', value, url: baseURL }]);

/** Opens the Filtros drawer of a list page and returns its dialog. */
export async function openFilters(page: Page) {
	await page.getByRole('button', { name: /^Filtros/ }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

/** Chooses `name` in the JS picker dialog opened by the button whose name matches `legend`. */
export async function pick(page: Page, legend: string, name: string) {
	await page.getByRole('button', { name: new RegExp(legend) }).click();
	// Pickers stack over the drawer they were opened from: the last dialog is the topmost.
	await page.getByRole('dialog').last().getByText(name, { exact: true }).click();
}

/** Sets the calendar's Select-based month and year (options render in a portal outside the dialog). */
async function pickMonthYear(page: Page, dialog: Locator, ymd: string) {
	const [y, m] = ymd.split('-').map(Number);
	await dialog.getByLabel('Año', { exact: true }).click();
	await page.getByRole('option', { name: String(y), exact: true }).click();
	const month = new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: 'UTC' }).format(
		new Date(Date.UTC(y, m - 1, 1))
	);
	await dialog.getByLabel('Mes', { exact: true }).click();
	await page.getByRole('option', { name: month, exact: true }).click();
}

/** Picks `ymd` (YYYY-MM-DD) in the calendar dialog opened by the button whose name matches `label`. */
export async function pickDate(page: Page, label: string, ymd: string) {
	await page.getByRole('button', { name: new RegExp(label) }).click();
	const dialog = page.getByRole('dialog');
	await pickMonthYear(page, dialog, ymd);
	await dialog.locator(`[data-bits-day][data-value="${ymd}"]`).click();
}

/** Picks `ymd` in the movement date drawer (Fecha > Otra fecha > month arrows > calendar day). */
export async function pickMovementDate(page: Page, ymd: string) {
	await page.getByRole('button', { name: /^Fecha/ }).click();
	const dialog = page.getByRole('dialog').last();
	if ((await dialog.locator('[data-bits-day]').count()) === 0)
		await dialog.getByRole('button', { name: 'Otra fecha' }).click();
	// The heading carries the shown month as data-month="YYYY-MM"; step to the target with the arrows.
	const heading = dialog.locator('[data-month]');
	const months = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7));
	const steps = months(ymd) - months((await heading.getAttribute('data-month'))!);
	const arrow = dialog.getByRole('button', { name: steps < 0 ? 'Mes anterior' : 'Mes siguiente' });
	for (let i = 0; i < Math.abs(steps); i++) await arrow.click();
	await expect(heading).toHaveAttribute('data-month', ymd.slice(0, 7));
	await dialog.locator(`[data-bits-day][data-value="${ymd}"]`).click();
}

/** Types `rate` into the Cotización row (tap the row, type, Enter) of the new-movement form. */
export async function fillRate(page: Page, rate: string) {
	const input = page.getByRole('textbox', { name: 'Cotización' });
	if (!(await input.isVisible())) await page.getByRole('button', { name: /^Cotización/ }).click();
	await input.fill(rate);
	await input.press('Enter');
}

/** Opens the new-movement form and fills it (JS pickers); the caller submits. */
export async function fillMovement(
	page: Page,
	o: {
		type: 'Ingreso' | 'Gasto' | 'Transferencia';
		amount: string;
		description: string;
		account: string;
		category?: string;
		destination?: string;
		rate?: string;
		date?: string;
	}
) {
	await gotoHydrated(page, '/movements/new');
	await page.getByRole('radio', { name: o.type === 'Transferencia' ? 'Transf.' : o.type }).check();
	if (o.date !== undefined) await pickMovementDate(page, o.date);
	await page.locator('input[name="amount"]').fill(o.amount);
	await page.locator('input[name="description"]').fill(o.description);
	await pick(page, o.destination ? 'Desde' : 'Cuenta', o.account);
	if (o.category) await pick(page, 'Categoría', o.category);
	if (o.destination) await pick(page, 'Hacia', o.destination);
	if (o.rate !== undefined) await fillRate(page, o.rate);
}

/** Picks a day of the month in the "Día del mes" drawer of a rule form. */
export async function pickDay(page: Page, day: string) {
	await page.getByRole('button', { name: /^Día del mes/ }).click();
	await page.getByRole('dialog').getByRole('button', { name: day, exact: true }).click();
}

/** Opens the new-rule form and fills it (JS pickers); the caller submits. */
export async function fillRule(
	page: Page,
	o: {
		description: string;
		amount: string;
		day: string;
		account: string;
		category: string;
		type?: 'income' | 'outcome';
	}
) {
	await gotoHydrated(page, `/plan/recurring/new${o.type === 'income' ? '?type=income' : ''}`);
	await page.locator('input[name="description"]').fill(o.description);
	await page.locator('input[name="amount"]').fill(o.amount);
	await pickDay(page, o.day);
	await pick(page, 'Cuenta', o.account);
	await pick(page, 'Categoría', o.category);
}

/** Picks an Ahorro list row (and, for "Otro", unit and value); the caller saves (Siguiente / Guardar). */
export async function fillSavings(
	page: Page,
	o: { option: 'Nada' | '10%' | '20%' | 'Otro'; value?: string; unit?: '%' | '$' | 'US$' }
) {
	await page.getByRole('button', { name: new RegExp('^' + o.option.replace('%', ' %')) }).click();
	if (o.option !== 'Otro') return;
	if (o.unit) await page.getByRole('radio', { name: o.unit, exact: true }).click();
	await page.locator('input[name="savingsValue"]').fill(o.value ?? '');
}

/** Posts the `delete` form action of `href` the way a no-JS form would. */
export const postDelete = (page: Page, baseURL: string, href: string) =>
	page.request.post(`${href}?/delete`, {
		form: {},
		headers: { origin: baseURL, accept: 'text/html' }
	});

/** Detail URLs of the movements a /movements search for `query` lists. */
export async function findMovements(page: Page, query: string, currency?: 'ARS' | 'USD') {
	const filter = currency ? `&currency=${currency}` : '';
	// all=1: the list defaults to this month, and the movements may be dated anywhere.
	await page.goto(`/movements?q=${encodeURIComponent(query)}${filter}&all=1`);
	const hrefs = await page
		.locator('a[href*="movements/"]')
		.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
	return hrefs.filter((h) => MOVEMENT_DETAIL_RE.test(h));
}

/** Deletes every movement a /movements search for `query` lists. */
export async function deleteMovements(page: Page, baseURL: string, query: string) {
	for (const href of await findMovements(page, query)) await postDelete(page, baseURL, href);
}

/** Deletes every rule on /plan (in the cookie currency) whose row contains `description`. */
export async function deleteRules(page: Page, baseURL: string, description: string) {
	await page.goto('/plan');
	const hrefs = await rule(page, description)
		.getByRole('link')
		.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
	for (const href of hrefs) await postDelete(page, baseURL, href);
}

/** The last path segment (an entity id) of a link. */
export const linkId = (link: Locator) =>
	link.evaluate((a: HTMLAnchorElement) => a.pathname.split('/').pop()!);

/** Path + query of a link as the browser resolves it (SSR hrefs are relative). */
export const pathOf = (link: Locator) =>
	link.evaluate((a: HTMLAnchorElement) => a.pathname + a.search);

/** First detail link of an entity list, or null when the seed has no rows. */
export async function firstDetailHref(page: Page, entity: string, query = '') {
	await page.goto(`/${entity}${query}`);
	const link = page.locator(`main a[href*="${entity}/"]:not([href$="/new"])`).first();
	return (await link.count()) ? pathOf(link) : null;
}

/** `${prefix} ${Date.now()}`, recorded in `created` so the spec's afterEach can delete it. */
export function unique(created: string[], prefix: string) {
	const d = `${prefix} ${Date.now()}`;
	created.push(d);
	return d;
}

/** The "Movimiento guardado." toast. */
export function toast(page: Page) {
	return page.locator('[data-sonner-toast]', { hasText: 'Movimiento guardado.' }).first();
}

/** The Guardar button of a page or drawer. */
export const save = (scope: Page | Locator) =>
	scope.getByRole('button', { name: 'Guardar', exact: true });

/** A fixed-payment row on /plan. */
export const rule = (page: Page, text: string) => page.locator('.rule', { hasText: text });

/** The "Límites por categoría" section of /plan. */
export const limitsRegion = (page: Page) =>
	page.getByRole('region', { name: 'Límites por categoría' });

/** Presses Deshacer on the "Cambio guardado." toast and waits for it to go. */
export async function undo(page: Page) {
	await page.getByRole('button', { name: 'Deshacer' }).first().click();
	await expect(page.getByText('Cambio guardado.')).toHaveCount(0);
}

/** Posts a form the way a no-JS browser would; never throws on a 4xx. */
export const post = (page: Page, baseURL: string, path: string, form: Record<string, string>) =>
	page.request.post(path, { form, headers: { origin: baseURL, accept: 'text/html' } });

/** The path a URL points at, read from the `drawer` param when a direct load of a drawer URL redirected to its parent. */
export function drawerPath(url: string) {
	const u = new URL(url, 'http://localhost');
	return u.searchParams.get('drawer') ?? u.pathname + u.search;
}

/** Posts a create form and returns the new entity's id (the last path segment of the redirect). */
export async function createVia(
	page: Page,
	baseURL: string,
	path: string,
	form: Record<string, string>
) {
	const res = await post(page, baseURL, path, form);
	expect(res.ok()).toBe(true);
	return drawerPath(res.url()).split('?')[0].split('/').pop()!;
}

/** Creates an account through its form action and returns its id. */
export const createAccount = (
	page: Page,
	baseURL: string,
	name: string,
	currency: 'ARS' | 'USD',
	initialBalance = '0'
) =>
	createVia(page, baseURL, '/accounts/new', {
		name,
		currency,
		initialBalance,
		icon: 'bank',
		color: 'green'
	});

/** The id of the movement a /movements/new POST saved (it redirects with `?saved=<id>`). */
export const savedId = (res: { url(): string }) =>
	new URL(drawerPath(res.url()), 'http://localhost').searchParams.get('saved')!;

/** The `day` of the month `back` months ago, as YYYY-MM-DD (1 = this month, 2 = last month). */
export function monthDay(back: number, day = 15) {
	const [y, m] = todayInAppTz().split('-').map(Number);
	return new Date(Date.UTC(y, m - back, day)).toISOString().slice(0, 10);
}

/** The seeded `otro` user's category "Ajena" and rule "Regla ajena" ids, read from a second context. */
export async function foreignIds(browser: Browser, baseURL: string) {
	const context = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		await login(page, OTHER_EMAIL);
		await page.goto('/categories');
		const category = await linkId(page.getByRole('link', { name: /Ajena/ }));
		await page.goto('/plan');
		const rule = await linkId(page.getByRole('link', { name: /Regla ajena/ }).first());
		return { category, rule };
	} finally {
		await context.close();
	}
}

/** Deletes every category of the signed-in user whose link matches `name`. */
export async function deleteCategories(page: Page, baseURL: string, name: string) {
	await page.goto('/categories');
	const paths = await page
		.getByRole('link', { name: new RegExp(name) })
		.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).pathname));
	for (const path of paths) await postDelete(page, baseURL, path);
}

/** Waits for a background sync (MP, Gmail) to settle: `toPass`/`expect.poll` options; locator assertions take `.timeout`. */
export const SYNC_WAIT = { timeout: 40_000, intervals: [300, 500, 1000] };

/** The `"user".id` of `email`, as a subquery to embed in another query on the same `sql`. */
export const userIdOf = (sql: postgres.Sql, email: string) =>
	sql`(select id from "user" where email = ${email})`;

/** Runs `fn` with a connection to the e2e database. */
export async function withDb<T>(fn: (sql: postgres.Sql) => Promise<T>) {
	// Required by playwright.config.ts, which fails without it.
	const sql = postgres(process.env.DATABASE_URL!);
	try {
		return await fn(sql);
	} finally {
		await sql.end();
	}
}

/** The id of `email`'s account or category named `name` (names are unique per user in the seed). */
export const idByName = (table: 'financial_accounts' | 'categories', email: string, name: string) =>
	withDb(async (sql) => {
		const owner = table === 'categories' ? sql`user_id` : sql`owner_id`;
		const [row] = await sql`select id from ${sql(table)}
			where ${owner} = ${userIdOf(sql, email)} and name = ${name}`;
		return row.id as string;
	});

/** Posts a form to an action the way an enhanced form does (JSON answer, never an HTML page). */
export const postAction = (
	page: Page,
	baseURL: string,
	path: string,
	form: Record<string, string>
) => page.request.post(path, { form, headers: { origin: baseURL, 'x-sveltekit-action': 'true' } });

/** Uploads a Banco Galicia statement from /profile/galicia. */
export async function upload(page: Page, pdf: Buffer) {
	await page.goto('/profile/galicia');
	await page
		.locator('input[name="statement"]')
		.setInputFiles({ name: 'resumen.pdf', mimeType: 'application/pdf', buffer: pdf });
	await page.getByRole('button', { name: 'Subir resumen' }).click();
}

type FakeAlert = {
	merchant: string;
	amount: string;
	currency?: 'ARS' | 'USD';
	last4?: string;
	type?: string;
	foreign?: boolean;
	dkim?: 'pass' | 'fail';
	/** ISO date the alert is dated at (default: now). */
	date?: string;
	/** List the alert at `date` (as Gmail's `after:` does) instead of at its arrival. */
	listedAtDate?: boolean;
	/** A Banco Galicia Mastercard alert (in pesos; `amount` in es-AR form, "1.234,56"), with its cuotas. */
	mastercard?: { cuotas: string };
};

/** Puts a synthetic Visa (or Galicia Mastercard) alert in the fake Gmail mailbox. */
export async function fakeAlert(mailbox: string, o: FakeAlert) {
	const q = new URLSearchParams({
		email: mailbox,
		last4: o.last4 ?? '5678',
		merchant: o.merchant,
		amount: o.amount,
		currency: o.mastercard ? 'PESOS' : (o.currency ?? 'ARS'),
		// The words each bank's mail sends (not STORED_TYPE: a mail's input must not follow the app's constant).
		type: o.type ?? (o.mastercard ? 'COMPRA' : 'Compra'),
		foreign: o.foreign ? '1' : '0',
		dkim: o.dkim ?? 'pass'
	});
	if (o.date) q.set('date', o.date);
	if (o.listedAtDate) q.set('listed', 'date');
	if (o.mastercard) {
		q.set('network', 'mastercard');
		q.set('cuotas', o.mastercard.cuotas);
	}
	expect((await fetch(`${FAKE_GMAIL.url}/__fake/alert?${q}`)).ok).toBe(true);
}

/** Runs the sync through the "Sincronizar" action of /imports (the Gmail part runs before it answers). */
export async function gmailSync(page: Page, baseURL: string) {
	expect((await post(page, baseURL, '/imports?/sync', {})).ok()).toBe(true);
}

/** Links Gmail as `mailbox`: starts the link without following the redirect, so the consent can be asked for that login_hint. */
export async function linkGmail(page: Page, baseURL: string, mailbox: string) {
	const start = await page.request.post('/profile/gmail?/connect', {
		form: {},
		headers: { origin: baseURL, accept: 'text/html' },
		maxRedirects: 0
	});
	const authorize = new URL(start.headers()['location']);
	authorize.searchParams.set('login_hint', mailbox);
	await page.goto(authorize.toString());
	await expect(page).toHaveURL(/\/profile\/gmail\?linked=1$/);
}

/** The review drawer of an imported item. */
export const reviewDrawer = (page: Page) =>
	page.getByRole('dialog', { name: 'Revisar movimiento' });

/** Opens the review drawer of the pending /imports item whose list row contains all `texts`. */
export async function openItem(page: Page, ...texts: string[]) {
	await gotoHydrated(page, '/imports');
	let row = page.locator('[role="list"] > [role="listitem"]');
	for (const t of texts) row = row.filter({ hasText: t });
	await row.getByRole('link').first().click();
	await expect(reviewDrawer(page)).toBeVisible();
	await expect(page).toHaveURL(/\/imports$/);
}
