// A movement's detail and edit in one drawer over the list: tap a field to change it, every change
// saves on its own with a Deshacer toast; Eliminar always confirms. Runs as `otro` (the demo user's
// totals are read by other specs): each test creates its own ARS accounts "<desc> A"/"<desc> B" and
// categories "<desc> C1"/"<desc> C2", plus a movement dated in the past, and removes them afterwards.
import { expect, test, type Page } from '@playwright/test';
import { es } from '../src/lib/copy/es';
import {
	createVia,
	deleteMovements,
	linkId,
	login,
	OTHER_EMAIL,
	PHONE,
	pick,
	pickMovementDate,
	post,
	postDelete,
	undo,
	gotoHydrated,
	waitForHydration
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
	/** C1 is a Gasto category and C2 an Ingreso one (default: both accept any type). */
	kinds?: boolean;
};

const fixture = { c1: '', c2: '', A: '', B: '' };

/** Creates this test's accounts and categories and one movement (2023-03-27, a Monday); returns its description. */
async function arrange(page: Page, baseURL: string, seed: Seed = {}) {
	const description = `Detalle ${Date.now()}`;
	created.push(description);
	const create = async (path: string, form: Record<string, string>) => {
		const id = await createVia(page, baseURL, path, form);
		createdUrls.push(path.replace('/new', '/' + id));
		return id;
	};
	const account = (name: string, color: string) =>
		create('/accounts/new', { name, currency: 'ARS', initialBalance: '0', icon: 'bank', color });
	const ids = {
		A: await account(`${description} A`, 'green'),
		B: await account(`${description} B`, 'blue'),
		USD: ''
	};
	const c1 = await create('/categories/new', {
		name: `${description} C1`,
		color: 'blue',
		kind: seed.kinds ? 'outcome' : ''
	});
	Object.assign(fixture, { c1, A: ids.A, B: ids.B });
	fixture.c2 = await create('/categories/new', {
		name: `${description} C2`,
		color: 'red',
		kind: seed.kinds ? 'income' : ''
	});
	await page.goto('/accounts');
	ids.USD = await linkId(page.getByRole('link', { name: /^Otra cuenta(?! pesos)/ }));
	const res = await post(page, baseURL, '/movements/new', {
		type: seed.type ?? 'outcome',
		amount: seed.amount ?? '1000',
		description,
		accountId: ids[seed.account ?? 'A'],
		...(seed.type === 'transfer'
			? { destinationAccountId: ids[seed.destination ?? 'USD'], exchangeRate: seed.rate ?? '' }
			: { categoryId: c1 }),
		occurredAt: seed.date ?? '2023-03-27'
	});
	expect(res.ok()).toBe(true);
	return description;
}

const listUrl = (description: string) => `/movements?q=${encodeURIComponent(description)}&all=1`;

/** The list row of `description`, behind or without the drawer (CSS: the modal hides it from roles). */
const rowOf = (page: Page, description: string) => page.locator('a', { hasText: description });

/** Opens the list filtered to `description` and taps its row: the detail drawer. */
async function openDrawer(page: Page, description: string) {
	await gotoHydrated(page, listUrl(description));
	await rowOf(page, description).click();
	const drawer = page.getByRole('dialog');
	await expect(drawer).toBeVisible();
	return drawer;
}

const saved = (page: Page) => page.getByText('Cambio guardado.');

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
	await expect(rowOf(page, desc)).toContainText('$2.500');
	await undo(page);
	await expect(drawer.getByRole('button', { name: 'Monto: 1.000' })).toBeVisible();
	await expect(rowOf(page, desc)).toContainText('$1.000');

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

	// Date.
	await pickMovementDate(page, '2023-03-28');
	await expect(saved(page)).toBeVisible();
	await expect(page.getByRole('dialog').getByRole('button', { name: /^Fecha/ })).toContainText(
		'28/03/2023'
	);
	await undo(page);
	await expect(page.getByRole('dialog').getByRole('button', { name: /^Fecha/ })).toContainText(
		'27/03/2023'
	);
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
	await expect(page.getByText(es.imports.errors.undoFailed)).toHaveCount(0);
	await expect(drawer.getByRole('button', { name: /^Hacia/ })).toContainText('Otra cuenta');
	await expect(drawer.getByRole('button', { name: 'Cotización: 1.000' })).toBeVisible();
});

test('a cross-currency Hacia asks for a Cotización and converts at it', async ({
	page,
	baseURL
}) => {
	const desc = await arrange(page, baseURL!, {
		type: 'transfer',
		account: 'A',
		destination: 'B'
	});
	const drawer = await openDrawer(page, desc);
	await pick(page, 'Hacia', 'Otra cuenta');
	const rate = drawer.getByRole('textbox', { name: 'Cotización' });
	await rate.fill('1000');
	await page.keyboard.press('Enter');
	await expect(saved(page)).toBeVisible();
	await expect(drawer.locator('p', { hasText: 'En destino' })).toContainText('US$1,00');
});

/** The topmost picker, once the staged type has opened the field it still needs. */
const prompted = (page: Page, name: string) =>
	page.getByRole('dialog').last().getByText(name, { exact: true });

test('Gasto to Ingreso asks for an Ingreso category, saves once, and Deshacer restores it', async ({
	page,
	baseURL
}) => {
	const desc = await arrange(page, baseURL!, { kinds: true });
	const drawer = await openDrawer(page, desc);

	await pick(page, 'Tipo', 'Ingreso');
	// The old category is a Gasto one: the category list opens, with Ingreso categories only.
	await expect(prompted(page, `${desc} C2`)).toBeVisible();
	await expect(prompted(page, `${desc} C1`)).toHaveCount(0);
	await expect(saved(page)).toHaveCount(0);
	await prompted(page, `${desc} C2`).click();

	await expect(saved(page)).toBeVisible();
	await expect(drawer.getByRole('button', { name: /^Tipo/ })).toContainText('Ingreso');
	await expect(drawer.getByRole('button', { name: /^Categoría/ })).toContainText(`${desc} C2`);
	await expect(rowOf(page, desc)).toContainText('+$1.000');

	await undo(page);
	await expect(drawer.getByRole('button', { name: /^Tipo/ })).toContainText('Gasto');
	await expect(drawer.getByRole('button', { name: /^Categoría/ })).toContainText(`${desc} C1`);
	await expect(rowOf(page, desc)).toContainText('-$1.000');

	// A transfer needs its destination: nothing is saved without it.
	const href = await rowOf(page, desc).getAttribute('href');
	const res = await page.request.post(`${href}?/update`, {
		form: { type: 'transfer' },
		headers: { origin: baseURL!, 'x-sveltekit-action': 'true' }
	});
	const body = await res.json();
	expect(body.type).toBe('failure');
	expect(body.data).toContain('Elegí la cuenta de destino.');
	await page.reload();
	await waitForHydration(page);
	await rowOf(page, desc).click();
	await expect(page.getByRole('dialog').getByRole('button', { name: /^Tipo/ })).toContainText(
		'Gasto'
	);
});

test('Transferencia to Gasto asks for a category; Deshacer restores type, destination, rate and amount', async ({
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

	await pick(page, 'Tipo', 'Gasto');
	await expect(prompted(page, `${desc} C1`)).toBeVisible();
	await expect(saved(page)).toHaveCount(0);
	await prompted(page, `${desc} C1`).click();

	await expect(saved(page)).toBeVisible();
	await expect(drawer.getByRole('button', { name: /^Tipo/ })).toContainText('Gasto');
	await expect(drawer.getByRole('button', { name: /^Cuenta/ })).toContainText(`${desc} A`);
	await expect(drawer.getByRole('button', { name: /^Categoría/ })).toContainText(`${desc} C1`);
	await expect(drawer.getByRole('button', { name: /^Hacia/ })).toHaveCount(0);

	await undo(page);
	await expect(page.getByText(es.imports.errors.undoFailed)).toHaveCount(0);
	await expect(drawer.getByRole('button', { name: /^Tipo/ })).toContainText('Transferencia');
	await expect(drawer.getByRole('button', { name: /^Hacia/ })).toContainText('Otra cuenta');
	await expect(drawer.getByRole('button', { name: 'Cotización: 1.000' })).toBeVisible();
	await expect(drawer.getByRole('button', { name: 'Monto: 1.000' })).toBeVisible();
	await expect(drawer.locator('p', { hasText: 'En destino' })).toContainText('US$1,00');
	await expect(drawer.getByRole('button', { name: /^Categoría/ })).toHaveCount(0);
});

/** Archives an account or category of this test through its own action. */
async function archive(page: Page, baseURL: string, path: string) {
	expect((await post(page, baseURL, `${path}?/archive`, {})).ok()).toBe(true);
}

test('Deshacer restores an archived category or account the movement had; a normal update to one is rejected', async ({
	page,
	baseURL
}) => {
	const desc = await arrange(page, baseURL!);
	await archive(page, baseURL!, `/categories/${fixture.c1}`);
	await archive(page, baseURL!, `/accounts/${fixture.A}`);
	const drawer = await openDrawer(page, desc);

	await pick(page, 'Categoría', `${desc} C2`);
	await expect(saved(page)).toBeVisible();
	await expect(drawer.getByRole('button', { name: /^Categoría/ })).toContainText(`${desc} C2`);
	await undo(page);
	await expect(page.getByText(es.imports.errors.undoFailed)).toHaveCount(0);
	await expect(drawer.getByRole('button', { name: /^Categoría/ })).toContainText(`${desc} C1`);

	await page.reload();
	await waitForHydration(page);
	await rowOf(page, desc).click();
	await expect(page.getByRole('dialog').getByRole('button', { name: /^Categoría/ })).toContainText(
		`${desc} C1`
	);

	await pick(page, 'Cuenta', `${desc} B`);
	await expect(saved(page)).toBeVisible();
	await expect(drawer.getByRole('button', { name: /^Cuenta/ })).toContainText(`${desc} B`);
	await undo(page);
	await expect(page.getByText(es.imports.errors.undoFailed)).toHaveCount(0);
	await expect(drawer.getByRole('button', { name: /^Cuenta/ })).toContainText(`${desc} A`);

	await page.reload();
	await waitForHydration(page);
	await rowOf(page, desc).click();
	await expect(page.getByRole('dialog').getByRole('button', { name: /^Cuenta/ })).toContainText(
		`${desc} A`
	);

	// A normal update to an archived category or account is still rejected.
	await archive(page, baseURL!, `/categories/${fixture.c2}`);
	await archive(page, baseURL!, `/accounts/${fixture.B}`);
	const href = await rowOf(page, desc).getAttribute('href');
	const update = async (form: Record<string, string>) => {
		const res = await page.request.post(`${href}?/update`, {
			form,
			headers: { origin: baseURL!, 'x-sveltekit-action': 'true' }
		});
		const body = await res.json();
		expect(body.type).toBe('failure');
		return body.data as string;
	};

	expect(await update({ categoryId: fixture.c2 })).toContain(es.movements.errors.archivedCategory);
	expect(await update({ accountId: fixture.B })).toContain(es.movements.errors.archivedAccount);
});
