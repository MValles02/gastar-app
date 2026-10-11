// Shared constants and steps for the E2E specs.
import { expect, type Locator, type Page } from '@playwright/test';

// Same defaults as scripts/seed.js (local demo users, not secrets).
export const SEED_EMAIL = process.env.SEED_EMAIL || 'demo@gastar.local';
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'demo1234';
/** Second seeded user, same password: ARS "Otra cuenta pesos", category "Ajena", USD rule "Regla ajena". */
export const OTHER_EMAIL = 'otro@gastar.local';

/** The app time zone (`TZ` in src/lib/server/month.ts, which is not importable here: it uses `$lib`). */
const APP_TZ = 'America/Argentina/Buenos_Aires';

/** Minimum touch target, in CSS px. */
export const MIN_TARGET_PX = 44;
export const PHONE = { width: 390, height: 844 };
export const SMALL_PHONE = { width: 320, height: 640 };

/** A movement detail URL (no trailing path). */
export const MOVEMENT_DETAIL_RE = /\/movements\/[0-9a-f-]{36}$/;

export const WHOLE_PESOS_ERROR = 'Los montos en pesos van sin decimales.';

/** Today in the app time zone, as YYYY-MM-DD. */
export const todayInAppTz = () =>
	new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ }).format(new Date());

/** Fills and submits the login form without checking the outcome. */
export async function submitLogin(page: Page, email: string, password = SEED_PASSWORD) {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Contraseña', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Ingresar' }).click();
}

/** Logs a seeded user in and waits for Inicio. */
export async function login(page: Page, email = SEED_EMAIL) {
	await submitLogin(page, email);
	await expect(page).toHaveURL(/\/$/);
}

/** Sets the currency cookie Inicio, Plan and Reportes read. */
export const setCurrencyCookie = (page: Page, baseURL: string, value: string) =>
	page.context().addCookies([{ name: 'currency', value, url: baseURL }]);

/** Chooses `name` in the JS picker dialog opened by the button whose name matches `legend`. */
export async function pick(page: Page, legend: string, name: string) {
	await page.getByRole('button', { name: new RegExp(legend) }).click();
	await page.getByRole('dialog').getByText(name, { exact: true }).click();
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
	await page.goto('/movements/new', { waitUntil: 'networkidle' });
	await page.getByRole('radio', { name: o.type }).check({ force: true });
	if (o.date !== undefined) await page.locator('input[name="occurredAt"]').fill(o.date);
	await page.locator('input[name="amount"]').fill(o.amount);
	await page.locator('input[name="description"]').fill(o.description);
	await pick(page, o.destination ? 'Cuenta de origen' : 'Cuenta', o.account);
	if (o.category) await pick(page, 'Categoría', o.category);
	if (o.destination) await pick(page, 'Cuenta de destino', o.destination);
	if (o.rate !== undefined) await page.locator('input[name="exchangeRate"]').fill(o.rate);
}

/** Opens the new-rule form and fills it (JS pickers); the caller submits. */
export async function fillRule(
	page: Page,
	o: { description: string; amount: string; day: string; account: string; category: string }
) {
	await page.goto('/plan/recurring/new', { waitUntil: 'networkidle' });
	await page.locator('input[name="description"]').fill(o.description);
	await page.locator('input[name="amount"]').fill(o.amount);
	await page.locator('input[name="dayOfMonth"]').fill(o.day);
	await pick(page, 'Cuenta', o.account);
	await pick(page, 'Categoría', o.category);
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
	await page.goto(`/movements?q=${encodeURIComponent(query)}${filter}`);
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
	const hrefs = await page
		.locator('li.rule', { hasText: description })
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

export async function expectNoHorizontalOverflow(page: Page) {
	const { scrollWidth, clientWidth } = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth
	}));
	expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}
