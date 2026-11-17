// Shared constants and steps for the E2E specs.
import {
	expect,
	type APIRequestContext,
	type Browser,
	type Locator,
	type Page
} from '@playwright/test';
import postgres from 'postgres';
import { APP_TZ } from '../src/lib/locale';
import { waitForLink } from './outbox';

// Same defaults as scripts/seed.js (local demo users, not secrets).
export const SEED_EMAIL = process.env.SEED_EMAIL || 'demo@gastar.local';
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'demo1234';
/** Second seeded user, same password: ARS "Otra cuenta pesos", category "Ajena", USD rule "Regla ajena". */
export const OTHER_EMAIL = 'otro@gastar.local';
/** Third seeded user, same password: owner of the Mercado Pago import account. */
export const IMPORT_EMAIL = 'importa@gastar.local';
/** Fourth seeded user, same password: ARS "Caja pesos" and USD "Caja dólares", for the Banco Galicia statements. */
export const GALICIA_EMAIL = 'galicia@gastar.local';

/** Fifth seeded user, same password: ARS "Pesos Visa A", USD "Dolares Visa A" and expense category "Compras Visa" (gmail-alerts.e2e.ts only). */
export const ALERTS_EMAIL = 'alertas@gastar.local';
/** Sixth seeded user, same password: ARS "Pesos Visa B" (gmail-alerts.e2e.ts only). */
export const ALERTS_B_EMAIL = 'alertas-b@gastar.local';

export const PHONE = { width: 390, height: 844 };

/** `test.use` options for a spec block that runs without JavaScript. */
export const NO_JS = { javaScriptEnabled: false };

/** A movement detail URL (no trailing path). */
export const MOVEMENT_DETAIL_RE = /\/movements\/[0-9a-f-]{36}$/;

export const WHOLE_PESOS_ERROR = 'Los montos en pesos van sin decimales.';

/** Today in the app time zone, as YYYY-MM-DD. */
export const todayInAppTz = () =>
	new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ }).format(new Date());

/** Fills and submits the login form without checking the outcome. */
export async function submitLogin(page: Page, email: string, password = SEED_PASSWORD) {
	// hydration guard: the form must be hydrated before it is filled.
	await page.goto('/login', { waitUntil: 'networkidle' });
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
	// hydration guard: the form must be hydrated before it is filled.
	await page.goto('/signup', { waitUntil: 'networkidle' });
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
	// hydration guard: the type toggle and pickers need JavaScript.
	await page.goto('/movements/new', { waitUntil: 'networkidle' });
	await page
		.getByRole('radio', { name: o.type === 'Transferencia' ? 'Transf.' : o.type })
		.check({ force: true });
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
	// hydration guard: the day and picker drawers need JavaScript.
	await page.goto(`/plan/recurring/new${o.type === 'income' ? '?type=income' : ''}`, {
		waitUntil: 'networkidle'
	});
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
		.locator('a[data-slot="item"]')
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

/** Text with whitespace runs (NBSP included) collapsed to one space and zero-width spaces dropped. */
export function norm(s: string | null) {
	return (s ?? '')
		.replace(/\u200B/g, '')
		.replace(/\s+/g, ' ')
		.trim();
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

/** A radio of the no-JS movement form, where the pickers render as plain radio groups. */
export const noJsOption = (page: Page, group: 'Cuenta' | 'Categoría', name: RegExp) =>
	page.getByRole('group', { name: group, exact: true }).getByRole('radio', { name });

/** Posts a form the way a no-JS browser would; never throws on a 4xx. */
export const post = (page: Page, baseURL: string, path: string, form: Record<string, string>) =>
	page.request.post(path, { form, headers: { origin: baseURL, accept: 'text/html' } });

/** Posts a create form and returns the new entity's id (the last path segment of the redirect). */
export async function createVia(
	page: Page,
	baseURL: string,
	path: string,
	form: Record<string, string>
) {
	const res = await post(page, baseURL, path, form);
	expect(res.ok()).toBe(true);
	return res.url().split('/').pop()!;
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
export const savedId = (res: { url(): string }) => new URL(res.url()).searchParams.get('saved')!;

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

/** Runs `fn` with a connection to the e2e database. */
export async function withDb<T>(fn: (sql: postgres.Sql) => Promise<T>) {
	const sql = postgres(
		process.env.DATABASE_URL || 'postgres://gastar:gastar@localhost:5432/gastar'
	);
	try {
		return await fn(sql);
	} finally {
		await sql.end();
	}
}

/** Uploads a Banco Galicia statement from /profile/galicia. */
export async function upload(page: Page, pdf: Buffer) {
	await page.goto('/profile/galicia');
	await page
		.locator('input[name="statement"]')
		.setInputFiles({ name: 'resumen.pdf', mimeType: 'application/pdf', buffer: pdf });
	await page.getByRole('button', { name: 'Subir resumen' }).click();
}

/** The review drawer of an imported item. */
export const reviewDrawer = (page: Page) =>
	page.getByRole('dialog', { name: 'Revisar movimiento' });

/** Opens the review drawer of the pending /imports item whose list row contains all `texts`. */
export async function openItem(page: Page, ...texts: string[]) {
	await page.goto('/imports');
	await page.waitForLoadState('networkidle'); // hydration guard: the drawer is a shallow route opened by JS
	let row = page.locator('[data-slot="item-group"] [role="listitem"]');
	for (const t of texts) row = row.filter({ hasText: t });
	await row.getByRole('link').first().click();
	await expect(reviewDrawer(page)).toBeVisible();
	await expect(page).toHaveURL(/\/imports$/);
}
