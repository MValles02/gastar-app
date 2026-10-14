import { expect, test, type Page } from '@playwright/test';
import { deleteMovements, fillMovement, login, OTHER_EMAIL, postDelete } from './helpers';

const DETAIL_RE = /\/categories\/[0-9a-f-]{36}$/;
const LOCKED = 'Tiene movimientos, solo se puede cambiar a Ambos.';

/** Creates a category through the form (JS) and returns its detail path. */
async function createCategory(page: Page, name: string, o: { kind?: string; icon?: string } = {}) {
	await page.goto('/categories/new', { waitUntil: 'networkidle' });
	await page.locator('input[name="name"]').fill(name);
	if (o.kind) await page.getByRole('radio', { name: o.kind }).check({ force: true });
	if (o.icon) {
		await page.getByRole('button', { name: /^Ícono/ }).click();
		await page.getByRole('dialog').getByRole('radio', { name: o.icon }).click();
	}
	await page.getByRole('button', { name: 'Crear categoría' }).click();
	await expect(page).toHaveURL(DETAIL_RE);
	return new URL(page.url()).pathname;
}

test('the icon chosen on create shows on the category detail', async ({ page, baseURL }) => {
	await login(page, OTHER_EMAIL);
	const href = await createCategory(page, `Cat ícono ${Date.now()}`, { icon: 'Comida' });
	try {
		await expect(page.getByText('Comida · Verde')).toBeVisible();
		await expect(page.getByText('Ícono y color')).toBeVisible();
		await expect(page.getByText('Este mes', { exact: true })).toHaveCount(0);
	} finally {
		await postDelete(page, baseURL!, href);
	}
});

test('the list groups by kind and the kind filter keeps Ambos categories', async ({ page }) => {
	await login(page);
	await page.goto('/categories', { waitUntil: 'networkidle' });
	const section = (name: string) =>
		page.locator('section').filter({ has: page.getByRole('heading', { name }) });
	await expect(section('Gastos').getByText('Supermercado', { exact: true })).toBeVisible();
	await expect(section('Ingresos').getByText('Sueldo', { exact: true })).toBeVisible();
	await expect(section('Ambos').getByText('Regalos', { exact: true })).toBeVisible();

	await page.goto('/categories?kind=outcome', { waitUntil: 'networkidle' });
	await expect(section('Gastos').getByText('Supermercado', { exact: true })).toBeVisible();
	await expect(section('Ambos').getByText('Regalos', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Ingresos' })).toHaveCount(0);
});

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

		await page.goto('/categories', { waitUntil: 'networkidle' });
		await expect(row(name)).toContainText('$1.000');
		await expect(row(name)).not.toContainText('US$');
		await expect(row(empty)).toContainText('$0');

		await page.goto('/categories?currency=USD', { waitUntil: 'networkidle' });
		await expect(row(name)).toContainText('US$10,00');
		await expect(row(empty)).toContainText('US$0,00');

		await page.goto('/categories?currency=both', { waitUntil: 'networkidle' });
		await expect(row(name)).toContainText(/\$1\.000[\s\S]*US\$10,00/);
		await expect(page.getByRole('button', { name: /^Filtros/ })).toContainText('1');
	} finally {
		await deleteMovements(page, baseURL!, description);
		for (const href of hrefs) await postDelete(page, baseURL!, href);
	}
});

test('a category with movements can only widen to Ambos, also server-side', async ({
	page,
	baseURL
}) => {
	await login(page, OTHER_EMAIL);
	const stamp = Date.now();
	const name = `Cat tipo ${stamp}`;
	const description = `Tipo ${stamp}`;
	const href = await createCategory(page, name, { kind: 'Gasto' });
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

		await page.goto(`${href}/edit`, { waitUntil: 'networkidle' });
		await expect(page.getByRole('radio', { name: 'Ingreso' })).toBeDisabled();
		await expect(page.getByRole('radio', { name: 'Gasto' })).toBeEnabled();
		await expect(page.getByRole('radio', { name: 'Ambos' })).toBeEnabled();
		await expect(page.getByText(LOCKED)).toBeVisible();

		const post = (kind: string) =>
			page.request.post(`${href}/edit`, {
				form: { name, color: 'green', icon: '', kind },
				headers: { origin: baseURL!, accept: 'text/html' }
			});
		const rejected = await post('income');
		expect(rejected.status()).toBe(400);
		expect(await rejected.text()).toContain(LOCKED);

		expect((await post('')).ok()).toBe(true);
		await page.goto(href);
		await expect(page.locator('.item', { hasText: 'Tipo' })).toContainText('Ambos');
	} finally {
		await deleteMovements(page, baseURL!, description);
		await postDelete(page, baseURL!, href);
	}
});
