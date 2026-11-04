// A movement's detail and edit in one drawer over the list: tap a field to change it, every change
// saves on its own with a Deshacer toast; Eliminar always confirms. Runs as `otro` (the demo user's
// totals are read by other specs): each test creates its own ARS accounts "<desc> A"/"<desc> B" and
// categories "<desc> C1"/"<desc> C2", plus a movement dated in the past, and removes them afterwards.
import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	linkId,
	login,
	MOVEMENT_DETAIL_RE,
	OTHER_EMAIL,
	PHONE,
	pick,
	pickMovementDate,
	postDelete,
	WHOLE_PESOS_ERROR
} from './helpers';

test.use({ viewport: PHONE });

const created: string[] = [];
const createdUrls: string[] = [];

test.beforeEach(async ({ page }) => {
	await login(page, OTHER_EMAIL);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
	for (const url of createdUrls.splice(0)) await postDelete(page, baseURL!, url);
});

type Seed = {
	type?: 'outcome' | 'transfer';
	amount?: string;
	/** 'A' or 'B' (this test's ARS accounts) or 'USD' (the seeded USD account). */
	account?: 'A' | 'B' | 'USD';
	destination?: 'A' | 'B' | 'USD';
	rate?: string;
	date?: string;
};

/** Creates this test's accounts and categories and one movement (2023-03-27, a Monday); returns its description. */
async function arrange(page: Page, baseURL: string, seed: Seed = {}) {
	const description = `Detalle ${Date.now()}`;
	created.push(description);
	const headers = { origin: baseURL, accept: 'text/html' };
	const post = async (path: string, form: Record<string, string>) => {
		const res = await page.request.post(path, { form, headers });
		expect(res.ok()).toBe(true);
		createdUrls.push(res.url());
		return res.url().split('/').pop()!;
	};
	const account = (name: string, color: string) =>
		post('/accounts/new', { name, currency: 'ARS', initialBalance: '0', icon: 'bank', color });
	const ids = {
		A: await account(`${description} A`, 'green'),
		B: await account(`${description} B`, 'blue'),
		USD: ''
	};
	const c1 = await post('/categories/new', { name: `${description} C1`, color: 'blue', kind: '' });
	await post('/categories/new', { name: `${description} C2`, color: 'red', kind: '' });
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	ids.USD = await linkId(page.getByRole('link', { name: /^Otra cuenta(?! pesos)/ }));
	const res = await page.request.post('/movements/new', {
		form: {
			type: seed.type ?? 'outcome',
			amount: seed.amount ?? '1000',
			description,
			accountId: ids[seed.account ?? 'A'],
			...(seed.type === 'transfer'
				? { destinationAccountId: ids[seed.destination ?? 'USD'], exchangeRate: seed.rate ?? '' }
				: { categoryId: c1 }),
			occurredAt: seed.date ?? '2023-03-27'
		},
		headers
	});
	expect(res.ok()).toBe(true);
	return description;
}

const listUrl = (description: string) => `/movements?q=${encodeURIComponent(description)}`;

/** The list row of `description`, behind or without the drawer (CSS: the modal hides it from roles). */
const rowOf = (page: Page, description: string) => page.locator('a', { hasText: description });

/** Opens the list filtered to `description` and taps its row: the detail drawer. */
async function openDrawer(page: Page, description: string) {
	await page.goto(listUrl(description), { waitUntil: 'networkidle' });
	await rowOf(page, description).click();
	const drawer = page.getByRole('dialog');
	await expect(drawer).toBeVisible();
	return drawer;
}

const saved = (page: Page) => page.getByText('Cambio guardado.');

/** Presses Deshacer on the toast and waits for it to go. */
async function undo(page: Page) {
	await page.getByRole('button', { name: 'Deshacer' }).first().click();
	await expect(saved(page)).toHaveCount(0);
}

test('the detail opens as a drawer over the list; scroll and filters survive closing', async ({
	page
}) => {
	// Read-only: the demo user has enough movements to scroll.
	await page.context().clearCookies();
	await login(page);
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	const accountId = await linkId(page.getByRole('link', { name: /Efectivo/ }));
	const list = `/movements?account=${accountId}`;
	await page.goto(list, { waitUntil: 'networkidle' });
	await expect(page.getByRole('button', { name: /^Filtros/ })).toContainText('1');

	await page.evaluate(() => window.scrollTo(0, 500));
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
	const before = await page.evaluate(() => window.scrollY);
	// A row that is in view (the sticky headers sit on top of the list).
	const rows = page.locator('a[href*="/movements/"]').filter({ has: page.locator('.row-amount') });
	const index = await rows.evaluateAll((els) =>
		els.findIndex((el) => {
			const r = el.getBoundingClientRect();
			return r.top > 200 && r.bottom < innerHeight - 160;
		})
	);
	expect(index).toBeGreaterThanOrEqual(0);
	const href = await rows.nth(index).getAttribute('href');
	await rows.nth(index).click();

	const drawer = page.getByRole('dialog');
	await expect(drawer.getByRole('button', { name: /^Monto: / })).toBeVisible();
	// Over the list: the URL did not change.
	expect(page.url()).toContain(list);
	expect(page.url()).not.toMatch(MOVEMENT_DETAIL_RE);
	expect(href).toMatch(MOVEMENT_DETAIL_RE);

	await page.keyboard.press('Escape');
	await expect(drawer).toHaveCount(0);
	expect(page.url()).toContain(list);
	await expect(page.getByRole('button', { name: /^Filtros/ })).toContainText('1');
	expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(40);
});

test('description, amount, account, category and date each autosave and Deshacer restores them', async ({
	page,
	baseURL
}) => {
	const desc = await arrange(page, baseURL!);
	const drawer = await openDrawer(page, desc);

	// Description.
	await drawer.getByRole('button', { name: `Descripción: ${desc}` }).click();
	await drawer.getByRole('textbox', { name: 'Descripción' }).fill(`${desc} nuevo`);
	await page.keyboard.press('Enter');
	await expect(saved(page)).toBeVisible();
	await expect(drawer.getByRole('button', { name: `Descripción: ${desc} nuevo` })).toBeVisible();
	await expect(rowOf(page, `${desc} nuevo`)).toBeVisible();
	await undo(page);
	await expect(drawer.getByRole('button', { name: `Descripción: ${desc}` })).toBeVisible();
	await expect(rowOf(page, `${desc} nuevo`)).toHaveCount(0);

	// Amount.
	await drawer.getByRole('button', { name: 'Monto: 1.000' }).click();
	await drawer.getByRole('textbox', { name: 'Monto' }).fill('2500');
	await page.keyboard.press('Enter');
	await expect(saved(page)).toBeVisible();
	await expect(drawer.getByRole('button', { name: 'Monto: 2.500' })).toContainText('$2.500');
	await expect(rowOf(page, desc).locator('.row-amount')).toContainText('$2.500');
	await undo(page);
	await expect(drawer.getByRole('button', { name: 'Monto: 1.000' })).toBeVisible();
	await expect(rowOf(page, desc).locator('.row-amount')).toContainText('$1.000');

	// Account.
	await pick(page, 'Cuenta', `${desc} B`);
	await expect(saved(page)).toBeVisible();
	await expect(drawer.getByRole('button', { name: /^Cuenta/ })).toContainText(`${desc} B`);
	await expect(rowOf(page, desc)).toContainText(`${desc} B`);
	await undo(page);
	await expect(drawer.getByRole('button', { name: /^Cuenta/ })).toContainText(`${desc} A`);
	await expect(rowOf(page, desc)).toContainText(`${desc} A`);

	// Category (the list row shows its icon only: the saved value is checked on reopening).
	await pick(page, 'Categoría', `${desc} C2`);
	await expect(saved(page)).toBeVisible();
	await expect(drawer.getByRole('button', { name: /^Categoría/ })).toContainText(`${desc} C2`);
	await undo(page);
	await expect(drawer.getByRole('button', { name: /^Categoría/ })).toContainText(`${desc} C1`);

	// Date: the list groups by day (2023-03-27 is a Monday).
	await expect(page.getByRole('heading', { level: 3, name: 'Lunes 27' })).toBeVisible();
	await pickMovementDate(page, '2023-03-28');
	await expect(saved(page)).toBeVisible();
	await expect(page.getByRole('dialog').getByRole('button', { name: /^Fecha/ })).toContainText(
		'28/03/2023'
	);
	await expect(page.locator('h3', { hasText: 'Martes 28' })).toBeVisible();
	await undo(page);
	await expect(page.getByRole('dialog').getByRole('button', { name: /^Fecha/ })).toContainText(
		'27/03/2023'
	);
	await expect(page.locator('h3', { hasText: 'Lunes 27' })).toBeVisible();
});

test('a transfer shows En destino and follows a changed Cotización', async ({ page, baseURL }) => {
	const desc = await arrange(page, baseURL!, {
		type: 'transfer',
		account: 'A',
		destination: 'USD',
		rate: '1000'
	});
	const drawer = await openDrawer(page, desc);
	const destino = drawer.locator('p', { hasText: 'En destino' });
	await expect(destino).toContainText('US$1,00');

	await drawer.getByRole('button', { name: 'Cotización: 1.000' }).click();
	await drawer.getByRole('textbox', { name: 'Cotización' }).fill('500');
	await page.keyboard.press('Enter');
	await expect(saved(page)).toBeVisible();
	await expect(destino).toContainText('US$2,00');
	await undo(page);
	await expect(destino).toContainText('US$1,00');
});

test('Eliminar confirms: Cancelar keeps the movement, Eliminar removes it for good', async ({
	page,
	baseURL
}) => {
	const desc = await arrange(page, baseURL!);
	const drawer = await openDrawer(page, desc);
	const url = page.url();

	await drawer.getByRole('button', { name: 'Eliminar' }).click();
	const confirm = page.getByRole('alertdialog');
	await expect(confirm).toContainText('¿Eliminar este movimiento?');
	await expect(confirm).toContainText('Esta acción no se puede deshacer.');
	await confirm.getByRole('button', { name: 'Cancelar' }).click();
	await expect(confirm).toBeHidden();
	await expect(drawer).toBeVisible();
	await expect(rowOf(page, desc)).toHaveCount(1);

	await drawer.getByRole('button', { name: 'Eliminar' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
	await expect(drawer).toHaveCount(0);
	expect(page.url()).toBe(url);
	await expect(rowOf(page, desc)).toHaveCount(0);
	// Not undoable: no Deshacer toast.
	await expect(page.getByRole('button', { name: 'Deshacer' })).toHaveCount(0);
});

test('a direct /movements/<id> renders the detail', async ({ page, baseURL }) => {
	const desc = await arrange(page, baseURL!);
	await page.goto(listUrl(desc), { waitUntil: 'networkidle' });
	const href = await rowOf(page, desc).getAttribute('href');
	expect(href).toMatch(MOVEMENT_DETAIL_RE);
	await page.goto(href!, { waitUntil: 'networkidle' });

	await expect(page).toHaveURL(MOVEMENT_DETAIL_RE);
	await expect(page.getByRole('button', { name: `Descripción: ${desc}` })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Monto: 1.000' })).toBeVisible();
	await expect(page.getByRole('button', { name: /^Fecha/ })).toContainText('27/03/2023');
	await expect(page.getByRole('button', { name: /^Cuenta/ })).toContainText(`${desc} A`);
	await expect(page.getByRole('button', { name: /^Categoría/ })).toContainText(`${desc} C1`);
});

test('an invalid amount shows the error and keeps the old value', async ({ page, baseURL }) => {
	const desc = await arrange(page, baseURL!);
	const drawer = await openDrawer(page, desc);

	await drawer.getByRole('button', { name: 'Monto: 1.000' }).click();
	await drawer.getByRole('textbox', { name: 'Monto' }).fill('10,50');
	await page.keyboard.press('Enter');
	await expect(drawer.getByRole('alert')).toHaveText(WHOLE_PESOS_ERROR);
	await expect(drawer.getByRole('button', { name: 'Monto: 1.000' })).toBeVisible();
	await expect(saved(page)).toHaveCount(0);
	await expect(rowOf(page, desc).locator('.row-amount')).toContainText('$1.000');
});

test('Deshacer restores a transfer account change that dropped the rate', async ({
	page,
	baseURL
}) => {
	const desc = await arrange(page, baseURL!, {
		type: 'transfer',
		account: 'A',
		destination: 'USD',
		rate: '1000'
	});
	const drawer = await openDrawer(page, desc);
	await pick(page, 'Hacia', `${desc} B`);
	await expect(saved(page)).toBeVisible();
	await expect(drawer.getByRole('button', { name: /^Hacia/ })).toContainText(`${desc} B`);
	await expect(drawer.getByRole('button', { name: /^Cotización/ })).toHaveCount(0);
	await undo(page);
	await expect(page.getByText('No se pudo deshacer.')).toHaveCount(0);
	await expect(drawer.getByRole('button', { name: /^Hacia/ })).toContainText('Otra cuenta');
	await expect(drawer.getByRole('button', { name: 'Cotización: 1.000' })).toBeVisible();
});

test('a cross-currency Hacia opens a focused, required Cotización', async ({ page, baseURL }) => {
	const desc = await arrange(page, baseURL!, {
		type: 'transfer',
		account: 'A',
		destination: 'B'
	});
	const drawer = await openDrawer(page, desc);
	await pick(page, 'Hacia', 'Otra cuenta');
	const rate = drawer.getByRole('textbox', { name: 'Cotización' });
	await expect(rate).toBeVisible();
	await expect(rate).toBeFocused();
	await expect(rate).toHaveAttribute('required', '');
});
