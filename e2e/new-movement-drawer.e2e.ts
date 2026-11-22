// "Nuevo movimiento" as a drawer opened from the + button over the current screen. Runs as `otro`.
import { expect, test, type Page } from '@playwright/test';
import {
	deleteMovements,
	findMovements,
	login,
	OTHER_EMAIL,
	PHONE,
	pick,
	save,
	setCurrencyCookie,
	toast,
	unique,
	gotoHydrated
} from './helpers';

test.use({ viewport: PHONE });

const created: string[] = [];

test.beforeEach(async ({ page }) => {
	await login(page, OTHER_EMAIL);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
});

const drawer = (page: Page) => page.getByRole('dialog', { name: 'Nuevo movimiento' });

async function open(page: Page, from = '/plan') {
	await gotoHydrated(page, from);
	await page
		.getByRole('navigation', { name: 'Navegación principal' })
		.getByRole('link', { name: 'Nuevo movimiento' })
		.click();
	await expect(drawer(page)).toBeVisible();
}

async function fill(page: Page, description: string) {
	await page.locator('input[name="amount"]').fill('1');
	await page.locator('input[name="description"]').fill(description);
}

test('Cuenta comes preselected and the movement is saved to that account', async ({
	page,
	baseURL
}) => {
	const description = unique(created, 'Preseleccion');
	// The default is the first account in the selected currency. movement-detail.e2e.ts creates and deletes
	// ARS accounts for `otro`, so pin USD, where the only account is the seeded one.
	await setCurrencyCookie(page, baseURL!, 'USD');
	await open(page);
	const account = drawer(page).getByRole('button', { name: /^Cuenta/ });
	await expect(account).not.toContainText('Elegir');
	const name = (await account.innerText()).replace(/^Cuentas*/, '').trim();
	await fill(page, description);
	await pick(page, 'Categoría', 'Ajena');
	await save(drawer(page)).click();
	await expect(toast(page)).toBeVisible();
	const [href] = await findMovements(page, description);
	await page.goto(href);
	await expect(page.getByRole('button', { name: `Cuenta ${name}` })).toBeVisible();

	// Deshacer on the saved toast removes the created movement.
	const undone = unique(created, 'Deshacer');
	await open(page, '/movements');
	await fill(page, undone);
	await pick(page, 'Categoría', 'Ajena');
	await save(drawer(page)).click();
	await expect(drawer(page)).toBeHidden();
	await expect(page.getByText(undone)).toBeVisible();
	await toast(page).getByRole('button', { name: 'Deshacer' }).click();
	await expect(page.getByText(undone)).toHaveCount(0);
	expect(await findMovements(page, undone)).toHaveLength(0);
});
