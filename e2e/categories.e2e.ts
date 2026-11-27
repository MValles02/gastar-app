import { expect, test, type Page } from '@playwright/test';
import { es } from '../src/lib/copy/es';
import {
	deleteMovements,
	fillMovement,
	login,
	OTHER_EMAIL,
	postDelete,
	gotoHydrated,
	waitForHydration
} from './helpers';

const DETAIL_RE = /\/categories\/[0-9a-f-]{36}$/;
const LOCKED = es.categories.errors.kindLocked;

/** Creates a category through the form (JS) and returns its detail path. */
async function createCategory(page: Page, name: string, o: { kind?: string } = {}) {
	await page.goto('/categories/new');
	await page.locator('input[name="name"]').fill(name);
	if (o.kind) await page.getByRole('radio', { name: o.kind }).check({ force: true });
	await page.getByRole('button', { name: 'Guardar', exact: true }).click();
	await expect(page).toHaveURL(DETAIL_RE);
	return new URL(page.url()).pathname;
}

test('rows show the month total and Ambas stacks ARS over USD', async ({ page, baseURL }) => {
	// Second user: movements on the demo user would race the Inicio/Reportes month totals.
	await login(page, OTHER_EMAIL);
	const stamp = Date.now();
	const name = `Cat totales ${stamp}`;
	const empty = `Cat vacía ${stamp}`;
	const description = `Totales ${stamp}`;
	const hrefs = [await createCategory(page, name), await createCategory(page, empty)];
	try {
		await fillMovement(page, {
			type: 'Gasto',
			amount: '1000',
			description,
			account: 'Otra cuenta pesos',
			category: name
		});
		await page.getByRole('button', { name: 'Guardar' }).click();
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();
		await fillMovement(page, {
			type: 'Gasto',
			amount: '10',
			description,
			account: 'Otra cuenta',
			category: name
		});
		await page.getByRole('button', { name: 'Guardar' }).click();
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();

		const row = (n: string) => page.locator('[role="listitem"]').filter({ hasText: n });

		await page.goto('/categories');
		await expect(row(name)).toContainText('$1.000');
		await expect(row(name)).not.toContainText('US$');
		await expect(row(empty)).toContainText('$0');

		await page.goto('/categories?currency=USD');
		await expect(row(name)).toContainText('US$10,00');
		await expect(row(empty)).toContainText('US$0,00');

		await page.goto('/categories?currency=both');
		await expect(row(name)).toContainText(/\$1\.000[\s\S]*US\$10,00/);
		await expect(page.getByRole('button', { name: /^Filtros/ })).toContainText('1');
	} finally {
		await deleteMovements(page, baseURL!, description);
		for (const href of hrefs) await postDelete(page, baseURL!, href);
	}
});

test('a category with movements can only widen to Ambos, also server-side; the change persists and Deshacer restores it', async ({
	page,
	baseURL
}) => {
	await login(page, OTHER_EMAIL);
	const stamp = Date.now();
	const name = `Cat tipo ${stamp}`;
	const description = `Tipo ${stamp}`;
	const href = await createCategory(page, name, { kind: 'Gastos' });
	try {
		await fillMovement(page, {
			type: 'Gasto',
			amount: '100',
			description,
			account: 'Otra cuenta pesos',
			category: name
		});
		await page.getByRole('button', { name: 'Guardar' }).click();
		// Saving redirects back to /movements/new, so wait for the toast, not the URL.
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();

		await gotoHydrated(page, href);
		await page.getByRole('button', { name: /^Se usa para/ }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('button', { name: /^Ingresos/ })).toBeDisabled();
		await expect(dialog.getByRole('button', { name: /^Gastos/ })).toBeEnabled();
		await expect(dialog.getByRole('button', { name: /^Ambos/ })).toBeEnabled();
		await expect(page.getByText(LOCKED)).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();

		const rejected = await page.request.post(`${href}?/update`, {
			form: { kind: 'income' },
			headers: { origin: baseURL!, 'x-sveltekit-action': 'true' }
		});
		const body = await rejected.json();
		expect(body.type).toBe('failure');
		expect(body.data).toContain(LOCKED);

		await page.getByRole('button', { name: /^Se usa para/ }).click();
		await dialog.getByRole('button', { name: /^Ambos/ }).click();
		await expect(page.getByText('Cambio guardado.')).toBeVisible();
		await page.reload();
		await expect(page.getByRole('button', { name: /^Se usa para/ })).toContainText('Ambos');
		await waitForHydration(page);
		await page.getByRole('button', { name: /^Se usa para/ }).click();
		await dialog.getByRole('button', { name: /^Gastos/ }).click();
		await expect(page.getByText('Cambio guardado.')).toBeVisible();
		await page.getByRole('button', { name: 'Deshacer' }).first().click();
		await expect(page.getByRole('button', { name: /^Se usa para/ })).toContainText('Ambos');
	} finally {
		await deleteMovements(page, baseURL!, description);
		await postDelete(page, baseURL!, href);
	}
});

test('archiving a category hides it from the new-movement picker and Desarchivar brings it back', async ({
	page,
	baseURL
}) => {
	await login(page, OTHER_EMAIL);
	const name = `Cat archivo ${Date.now()}`;
	const href = await createCategory(page, name);
	try {
		/** How many times the new-movement category picker offers the category. */
		const offered = async () => {
			await gotoHydrated(page, '/movements/new');
			await page.getByRole('button', { name: /^Categoría/ }).click();
			const dialog = page.getByRole('dialog').last();
			await expect(dialog).toBeVisible();
			return dialog.getByText(name, { exact: true }).count();
		};
		expect(await offered()).toBe(1);

		await gotoHydrated(page, href);
		await page.getByRole('button', { name: 'Archivar' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Archivar' }).click();
		await expect(page.getByRole('button', { name: 'Desarchivar' })).toBeVisible();
		expect(await offered()).toBe(0);

		await gotoHydrated(page, href);
		await page.getByRole('button', { name: 'Desarchivar' }).click();
		await expect(page.getByRole('button', { name: 'Archivar', exact: true })).toBeVisible();
		expect(await offered()).toBe(1);
	} finally {
		await postDelete(page, baseURL!, href);
	}
});
