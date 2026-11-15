import { expect, test, type Page } from '@playwright/test';
import {
	fillMovement,
	fillRule,
	login,
	OTHER_EMAIL,
	pathOf,
	signUpVerified,
	submitLogin,
	undo
} from './helpers';

// This spec uses 1 sign-up (see signUpVerified for the suite's budget).
const password = 'e2e-pass-1234';

// One user for the account tests. Serial because change-password changes the shared
// credentials and delete-account (last) removes the user.
test.describe('account changes', () => {
	test.describe.configure({ mode: 'serial' });
	const email = `e2e+profile-${Date.now()}@gastar.local`;
	let current = password;

	test.beforeAll(async ({ browser, baseURL }) => {
		const context = await browser.newContext({ baseURL });
		try {
			await signUpVerified(await context.newPage(), context.request, {
				email,
				password,
				name: 'Nombre Viejo'
			});
		} finally {
			await context.close();
		}
	});

	const signIn = async (page: Page) => {
		await submitLogin(page, email, current);
		await expect(page).toHaveURL(/\/$/);
	};

	test('name autosaves in place, keeps the old one on an error and Deshacer restores it', async ({
		page
	}) => {
		await signIn(page);

		const stored = async (name: string) => {
			await page.goto('/profile', { waitUntil: 'networkidle' }); // hydration guard: the inline edit needs JS
			await expect(page.getByRole('button', { name: `Nombre: ${name}` })).toBeVisible();
		};
		const edit = async (value: string) => {
			await page.getByRole('button', { name: /^Nombre: / }).click();
			await page.getByRole('textbox', { name: 'Nombre' }).fill(value);
			await page.getByRole('textbox', { name: 'Nombre' }).press('Enter');
		};

		await stored('Nombre Viejo');
		await edit('   ');
		await expect(page.getByRole('alert').filter({ hasText: 'Falta el nombre.' })).toBeVisible();
		await stored('Nombre Viejo');

		await edit('  Nombre Nuevo  ');
		await expect(page.getByText('Cambio guardado.')).toBeVisible();
		await undo(page);
		await stored('Nombre Viejo');

		await edit('Nombre Nuevo');
		await expect(page.getByText('Cambio guardado.')).toBeVisible();
		await stored('Nombre Nuevo');
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 1, name: /^Hola, Nombre/ })).toBeAttached();
		expect((await page.request.get('/profile/name')).status()).toBe(404);
	});

	test('change password revokes other sessions and keeps this one', async ({ page, browser }) => {
		const newPassword = 'e2e-new-pass-5678';
		await signIn(page);

		const other = await browser.newContext();
		const pageB = await other.newPage();
		await submitLogin(pageB, email, current);
		await expect(pageB).toHaveURL(/\/$/);

		// The direct URL is the page variant of the drawer: same form and server errors.
		await page.goto('/profile/password');
		await page.locator('#current-password').fill('incorrecta-123');
		await page.locator('#new-password').fill(newPassword);
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('La contraseña actual no es correcta.')).toBeVisible();

		await page.goto('/profile');
		await page.waitForLoadState('networkidle'); // hydration guard: the drawer opens only through JS
		await page.getByRole('link', { name: 'Contraseña' }).click();
		const drawer = page.getByRole('dialog', { name: 'Cambiar contraseña' });
		await expect(page).toHaveURL(/\/profile$/);
		const save = drawer.getByRole('button', { name: 'Guardar', exact: true });

		await drawer.locator('#current-password').fill(current);
		await drawer.locator('#new-password').fill('corta');
		await save.click();
		await expect(drawer.getByText('Mínimo 8 caracteres.', { exact: true }).first()).toBeVisible();

		await drawer.locator('#new-password').fill(newPassword);
		await save.click();
		await expect(drawer).toBeHidden();
		await expect(page).toHaveURL(/\/profile$/);
		await page.goto('/');
		await expect(page).toHaveURL(/\/$/);

		await pageB.goto('/');
		await expect(pageB).toHaveURL(/\/login/);
		await other.close();

		await page.context().clearCookies();
		await submitLogin(page, email, current);
		await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible();
		await submitLogin(page, email, newPassword);
		await expect(page).toHaveURL(/\/$/);
		current = newPassword;
	});

	test('delete account removes the user and all their data', async ({ page }) => {
		test.setTimeout(90_000);
		await signIn(page);

		// Data in every table with a user FK that a fresh user can create cheaply.
		await page.goto('/accounts/new');
		await page.getByLabel('Nombre').fill('Cuenta borrar');
		await page.getByLabel('Saldo inicial').fill('1.000');
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
		await page.goto('/categories/new');
		await page.locator('input[name="name"]').fill('Categoria borrar');
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/categories\/[0-9a-f-]{36}$/);
		await fillMovement(page, {
			type: 'Gasto',
			amount: '100',
			description: 'Mov borrar',
			account: 'Cuenta borrar',
			category: 'Categoria borrar'
		});
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page.getByText('Movimiento guardado.')).toBeVisible();
		await fillRule(page, {
			description: 'Regla borrar',
			amount: '50',
			day: '5',
			account: 'Cuenta borrar',
			category: 'Categoria borrar'
		});
		await page.getByRole('button', { name: 'Guardar', exact: true }).click();
		await expect(page).toHaveURL(/\/plan/);

		await page.goto('/profile');
		await page.waitForLoadState('networkidle'); // hydration guard: the drawer opens only through JS
		await page.getByRole('link', { name: 'Darme de baja' }).click();
		const drawer = page.getByRole('dialog', { name: '¿Darte de baja?' });
		await expect(page).toHaveURL(/\/profile$/);
		await expect(drawer).toContainText('1 cuenta y 1 movimiento');
		await drawer.locator('#delete-password').fill('incorrecta-123');
		await drawer.getByRole('button', { name: 'Darme de baja' }).click();
		await expect(drawer.getByText('La contraseña no es correcta.')).toBeVisible();

		await drawer.locator('#delete-password').fill(current);
		await drawer.getByRole('button', { name: 'Darme de baja' }).click();
		await expect(page).toHaveURL(/\/login/);

		await page.goto('/');
		await expect(page).toHaveURL(/\/login/);
		await submitLogin(page, email, current);
		await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible();

		// Deleting one user leaves the other users' data intact.
		await login(page, OTHER_EMAIL);
		await page.goto('/accounts');
		const otherAccount = page.getByRole('link', { name: /Otra cuenta pesos/ });
		await expect(otherAccount).toBeVisible();
		await page.goto(await pathOf(otherAccount));
		await expect(page.locator('main')).toContainText('Otra cuenta pesos');
		await page.goto('/categories');
		await expect(page.getByRole('link', { name: /Ajena/ })).toBeVisible();
	});
});
