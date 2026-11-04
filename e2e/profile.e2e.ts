import { expect, test, type Page } from '@playwright/test';
import { fillMovement, fillRule, signUpVerified, submitLogin } from './helpers';

// Sign-up is rate-limited to 10/h/IP (in-memory): this spec uses 1 sign-up, shared by the
// account tests. Restart the dev server to reset the counters.
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

	test('change name updates the profile and the greeting', async ({ page }) => {
		await signIn(page);

		await page.goto('/profile');
		await page.getByRole('link', { name: 'Cambiar nombre' }).click();
		await expect(page).toHaveURL(/\/profile\/name$/);
		await page.getByLabel('Nombre').fill('   ');
		await page.getByRole('button', { name: 'Guardar cambios' }).click();
		await expect(page.getByText('Falta el nombre.')).toBeVisible();

		await page.getByLabel('Nombre').fill('  Nombre Nuevo  ');
		await page.getByRole('button', { name: 'Guardar cambios' }).click();
		await expect(page).toHaveURL(/\/profile$/);
		await expect(page.locator('.who .name')).toHaveText('Nombre Nuevo');
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 1, name: /^Hola, Nombre/ })).toBeAttached();
	});

	test('change password revokes other sessions and keeps this one', async ({ page, browser }) => {
		const newPassword = 'e2e-new-pass-5678';
		await signIn(page);

		const other = await browser.newContext();
		const pageB = await other.newPage();
		await submitLogin(pageB, email, current);
		await expect(pageB).toHaveURL(/\/$/);

		await page.goto('/profile/password');
		const currentField = page.locator('#current-password');
		const next = page.locator('#new-password');
		const save = page.getByRole('button', { name: 'Guardar cambios' });

		await currentField.fill('incorrecta-123');
		await next.fill(newPassword);
		await save.click();
		await expect(page.getByText('La contraseña actual no es correcta.')).toBeVisible();

		await currentField.fill(current);
		await next.fill('corta');
		await save.click();
		await expect(page.getByText('Mínimo 8 caracteres.', { exact: true })).toBeVisible();

		await currentField.fill(current);
		await next.fill(newPassword);
		await save.click();
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

		await page.goto('/profile/delete');
		await page.waitForLoadState('networkidle'); // hydration guard: the confirm dialog replaces its no-JS fallback only after mount
		await page.locator('#delete-password').fill('incorrecta-123');
		await page.getByRole('button', { name: 'Darme de baja' }).click();
		await page
			.getByRole('alertdialog')
			.getByRole('button', { name: 'Darme de baja', exact: true })
			.click();
		await expect(page.getByText('La contraseña no es correcta.')).toBeVisible();
		await expect(page).toHaveURL(/\/profile\/delete$/);
		await page.goto('/');
		await expect(page).toHaveURL(/\/$/);

		await page.goto('/profile/delete');
		await page.waitForLoadState('networkidle'); // hydration guard: the confirm dialog replaces its no-JS fallback only after mount
		await page.locator('#delete-password').fill(current);
		await page.getByRole('button', { name: 'Darme de baja' }).click();
		await page
			.getByRole('alertdialog')
			.getByRole('button', { name: 'Darme de baja', exact: true })
			.click();
		await expect(page).toHaveURL(/\/login/);

		await page.goto('/');
		await expect(page).toHaveURL(/\/login/);
		await submitLogin(page, email, current);
		await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible();
	});
});
