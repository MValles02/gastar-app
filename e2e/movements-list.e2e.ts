// The /movements list: sticky month header with short day headings, and the Filtros drawer whose
// changes are staged until "Ver N movimientos". Data is arranged per test under a unique description.
import { expect, test, type Page } from '@playwright/test';
import { deleteMovements, IMPORT_EMAIL, linkId, login, PHONE, todayInAppTz } from './helpers';

test.use({ viewport: PHONE });

const created: string[] = [];

test.beforeEach(async ({ page }) => {
	await login(page);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
});

/** `YYYY-MM-DD` shifted by `days` (UTC arithmetic on the calendar day). */
const shift = (ymd: string, days: number) =>
	new Date(Date.parse(`${ymd}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Creates 1-peso outcomes; `rows` pairs an account name with a date. Returns the shared description prefix. */
async function arrange(page: Page, baseURL: string, rows: [string, string][]) {
	const prefix = `Lista ${Date.now()}`;
	created.push(prefix);
	await page.goto('/categories', { waitUntil: 'networkidle' });
	const categoryId = await linkId(page.getByRole('link', { name: /Supermercado/ }));
	const accountIds: Record<string, string> = {};
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	for (const [account] of rows)
		accountIds[account] ??= await linkId(page.getByRole('link', { name: new RegExp(account) }));
	for (const [i, [account, occurredAt]] of rows.entries()) {
		const res = await page.request.post('/movements/new', {
			form: {
				type: 'outcome',
				amount: '1',
				description: `${prefix} ${i}`,
				accountId: accountIds[account],
				categoryId,
				occurredAt
			},
			headers: { origin: baseURL, accept: 'text/html' }
		});
		expect(res.ok()).toBe(true);
	}
	return prefix;
}

const filtersButton = (page: Page) => page.getByRole('button', { name: /^Filtros/ });
const rowCount = (page: Page) => page.locator('[data-slot="item-group"] .row-amount').count();

/** Toggles `name` in the open Cuenta picker (it stays open). */
const toggle = (page: Page, name: string) =>
	page.getByRole('dialog').last().getByText(name, { exact: true }).click();

/** Closes the topmost (stacked picker) drawer. */
async function closePicker(page: Page) {
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog', { name: 'Cuenta', exact: true })).toHaveCount(0);
}

test('a sticky month header holds short day headings', async ({ page, baseURL }) => {
	const today = todayInAppTz();
	const yesterday = shift(today, -1);
	// 2023-03-27 was a Monday.
	const prefix = await arrange(page, baseURL!, [
		['Banco Galicia', today],
		['Banco Galicia', yesterday],
		['Banco Galicia', '2023-03-27']
	]);
	await page.goto(`/movements?q=${encodeURIComponent(prefix)}`, { waitUntil: 'networkidle' });

	const month = (ymd: string) => {
		const [y, m] = ymd.split('-').map(Number);
		const label = new Intl.DateTimeFormat('es-AR', {
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(Date.UTC(y, m - 1, 1, 12)));
		return label.charAt(0).toUpperCase() + label.slice(1);
	};
	await expect(page.getByRole('heading', { level: 2, name: month(today) })).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: month('2023-03-27') })).toBeVisible();
	await expect(page.getByRole('heading', { level: 3, name: 'Hoy', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { level: 3, name: 'Ayer', exact: true })).toBeVisible();
	await expect(
		page.getByRole('heading', { level: 3, name: 'Lunes 27', exact: true })
	).toBeVisible();
	// No long form ("Lunes 27 de marzo ...") anywhere.
	await expect(page.getByRole('heading', { level: 3, name: /\bde\b/ })).toHaveCount(0);
	await expect(page.getByRole('heading', { level: 2, name: month('2023-03-27') })).toHaveCSS(
		'position',
		'sticky'
	);
});

test('filter changes are staged until "Ver N movimientos", which equals the rows shown', async ({
	page,
	baseURL
}) => {
	const today = todayInAppTz();
	const prefix = await arrange(page, baseURL!, [
		['Efectivo', today],
		['Banco Galicia', today],
		['Banco Galicia', today]
	]);
	const list = `/movements?q=${encodeURIComponent(prefix)}`;
	await page.goto(list, { waitUntil: 'networkidle' });
	expect(await rowCount(page)).toBe(3);
	// The search term is not a filter: no badge, no "N movimientos" line.
	await expect(filtersButton(page)).toHaveText('Filtros');

	const before = page.url();
	const dialog = await openDrawer(page);
	await dialog.getByRole('button', { name: /^Cuenta/ }).click();
	await toggle(page, 'Banco Galicia');
	await closePicker(page);

	const see = dialog.getByRole('button', { name: /^Ver/ });
	await expect(see).toHaveText('Ver 2 movimientos');
	// Staged only: the URL and the list behind the drawer are untouched.
	expect(page.url()).toBe(before);
	expect(await rowCount(page)).toBe(3);

	await see.click();
	await expect(page).toHaveURL(/[?&]account=[0-9a-f-]{36}/);
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect.poll(() => rowCount(page)).toBe(2);
	await expect(filtersButton(page)).toContainText('1');
	await expect(page.getByRole('status').filter({ hasText: /movimientos?/ })).toHaveText(
		'2 movimientos'
	);
});

test('Cuenta takes several accounts; Limpiar resets the staged filters', async ({
	page,
	baseURL
}) => {
	const today = todayInAppTz();
	const prefix = await arrange(page, baseURL!, [
		['Efectivo', today],
		['Banco Galicia', today],
		['Banco Galicia', today]
	]);
	await page.goto(`/movements?q=${encodeURIComponent(prefix)}`, { waitUntil: 'networkidle' });

	const dialog = await openDrawer(page);
	await dialog.getByRole('button', { name: /^Cuenta/ }).click();
	await toggle(page, 'Banco Galicia');
	await toggle(page, 'Efectivo');
	await expect(page.getByRole('dialog').last().locator('[aria-pressed="true"]')).toHaveCount(2);
	await closePicker(page);
	await expect(dialog.getByRole('button', { name: /^Cuenta/ })).toContainText('2 cuentas');
	// Accounts decide the currency: Moneda is locked while any is staged.
	await expect(dialog.getByRole('radio', { name: 'Pesos' })).toBeDisabled();
	const see = dialog.getByRole('button', { name: /^Ver/ });
	await expect(see).toHaveText('Ver 3 movimientos');

	await dialog.getByText('Gastos', { exact: true }).click();
	await expect(see).toHaveText('Ver 3 movimientos');
	await dialog.getByRole('button', { name: 'Limpiar' }).click();
	await expect(dialog.getByRole('button', { name: /^Cuenta/ })).toContainText('Todas');
	await expect(dialog.getByRole('radio', { name: 'Todos' })).toBeChecked();
	await expect(see).toHaveText('Ver 3 movimientos');

	await dialog.getByRole('button', { name: /^Cuenta/ }).click();
	await toggle(page, 'Banco Galicia');
	await toggle(page, 'Efectivo');
	await closePicker(page);
	await see.click();
	await expect.poll(() => new URL(page.url()).searchParams.getAll('account').length).toBe(2);
	await expect.poll(() => rowCount(page)).toBe(3);
	await expect(filtersButton(page)).toContainText('1');
	await expect(page.getByRole('status').filter({ hasText: /movimientos?/ })).toHaveText(
		'3 movimientos'
	);

	// Limpiar then apply drops the filters but keeps the search term.
	const again = await openDrawer(page);
	await again.getByRole('button', { name: 'Limpiar' }).click();
	await again.getByRole('button', { name: /^Ver/ }).click();
	await expect.poll(() => new URL(page.url()).searchParams.has('account')).toBe(false);
	expect(new URL(page.url()).searchParams.get('q')).toBe(prefix);
	await expect(filtersButton(page)).toHaveText('Filtros');
});

test('the empty list offers "Nuevo movimiento", which opens the drawer in place', async ({
	page
}) => {
	// `importa` is seeded without movements (only mp-import writes to it).
	await page.context().clearCookies();
	await login(page, IMPORT_EMAIL);
	await page.goto('/movements', { waitUntil: 'networkidle' });
	test.skip((await page.getByText('Sin movimientos.').count()) === 0, 'the import spec is running');
	const url = page.url();
	await page.locator('main').getByRole('link', { name: 'Nuevo movimiento', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Nuevo movimiento' })).toBeVisible();
	expect(page.url()).toBe(url);
});

async function openDrawer(page: Page) {
	await filtersButton(page).click();
	const dialog = page.getByRole('dialog', { name: 'Filtros' });
	await expect(dialog).toBeVisible();
	return dialog;
}
