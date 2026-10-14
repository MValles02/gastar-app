import { expect, test } from '@playwright/test';
import {
	expectNoHorizontalOverflow,
	fillMovement,
	fillRule,
	login,
	PHONE,
	signUpVerified,
	submitLogin
} from './helpers';

// Sign-up is rate-limited to 10/h/IP (in-memory): this spec uses 3 sign-ups (name, password, delete).
// Restart the dev server to reset the counters.
const password = 'e2e-pass-1234';
let n = 0;
const uniqueEmail = () => `e2e+profile-${Date.now()}-${n++}@gastar.local`;

test('profile layout at 390px: theme row in a card, account rows, delete below logout', async ({
	page
}) => {
	await page.setViewportSize(PHONE);
	await login(page);
	await page.goto('/profile', { waitUntil: 'networkidle' });

	const themeCard = page.locator('[data-slot="card"][aria-label="Tema"]');
	await expect(themeCard.getByRole('radio', { name: 'Oscuro' })).toBeAttached();
	const account = page.locator('[data-slot="card"][aria-label="Tu cuenta"]');
	await expect(account.getByRole('link', { name: /^Nombre/ })).toBeVisible();
	await expect(account.getByRole('link', { name: 'Cambiar contraseña' })).toBeVisible();

	const logout = (await page.getByRole('button', { name: 'Cerrar sesión' }).boundingBox())!;
	const del = (await page.getByRole('link', { name: 'Eliminar cuenta' }).boundingBox())!;
	expect(del.y).toBeGreaterThan(logout.y + logout.height);
	await expectNoHorizontalOverflow(page);
});

test('change name updates the profile and the greeting', async ({ page, request }) => {
	const email = uniqueEmail();
	await signUpVerified(page, request, { email, password, name: 'Nombre Viejo' });

	await page.goto('/profile', { waitUntil: 'networkidle' });
	await page.getByRole('link', { name: /^Nombre/ }).click();
	await expect(page).toHaveURL(/\/profile\/name$/);
	await page.getByLabel('Nombre').fill('   ');
	await page.getByRole('button', { name: 'Guardar' }).click();
	await expect(page.getByText('Falta el nombre.')).toBeVisible();

	await page.getByLabel('Nombre').fill('  Nombre Nuevo  ');
	await page.getByRole('button', { name: 'Guardar' }).click();
	await expect(page).toHaveURL(/\/profile$/);
	await expect(page.locator('.who .name')).toHaveText('Nombre Nuevo');
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1, name: /^Hola, Nombre/ })).toBeAttached();
});

test('change password revokes other sessions and keeps this one', async ({
	page,
	request,
	browser
}) => {
	const email = uniqueEmail();
	const newPassword = 'e2e-new-pass-5678';
	await signUpVerified(page, request, { email, password, name: 'Clave' });

	const other = await browser.newContext();
	const pageB = await other.newPage();
	await submitLogin(pageB, email, password);
	await expect(pageB).toHaveURL(/\/$/);

	await page.goto('/profile/password', { waitUntil: 'networkidle' });
	const current = page.locator('#current-password');
	const next = page.locator('#new-password');
	const save = page.getByRole('button', { name: 'Guardar' });

	await current.fill('incorrecta-123');
	await next.fill(newPassword);
	await save.click();
	await expect(page.getByText('La contraseña actual no es correcta.')).toBeVisible();

	await current.fill(password);
	await next.fill('corta');
	await save.click();
	await expect(page.getByText('Mínimo 8 caracteres.', { exact: true })).toBeVisible();

	await current.fill(password);
	await next.fill(newPassword);
	await save.click();
	await expect(page).toHaveURL(/\/profile$/);
	await page.goto('/');
	await expect(page).toHaveURL(/\/$/);

	await pageB.goto('/');
	await expect(pageB).toHaveURL(/\/login/);
	await other.close();

	await page.context().clearCookies();
	await submitLogin(page, email, password);
	await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible();
	await submitLogin(page, email, newPassword);
	await expect(page).toHaveURL(/\/$/);
});

test('delete account removes the user and all their data', async ({ page, request }) => {
	test.setTimeout(90_000);
	const email = uniqueEmail();
	await signUpVerified(page, request, { email, password, name: 'Borrar' });

	// Data in every table with a user FK that a fresh user can create cheaply.
	await page.goto('/accounts/new', { waitUntil: 'networkidle' });
	await page.getByLabel('Nombre').fill('Cuenta borrar');
	await page.getByLabel('Saldo inicial').fill('1.000');
	await page.getByRole('button', { name: 'Crear cuenta' }).click();
	await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
	await page.goto('/categories/new', { waitUntil: 'networkidle' });
	await page.locator('input[name="name"]').fill('Categoria borrar');
	await page.getByRole('button', { name: 'Crear categoría' }).click();
	await expect(page).toHaveURL(/\/categories\/[0-9a-f-]{36}$/);
	await fillMovement(page, {
		type: 'Gasto',
		amount: '100',
		description: 'Mov borrar',
		account: 'Cuenta borrar',
		category: 'Categoria borrar'
	});
	await page.getByRole('button', { name: 'Guardar movimiento' }).click();
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

	await page.goto('/profile/delete', { waitUntil: 'networkidle' });
	await page.locator('#delete-password').fill('incorrecta-123');
	await page.getByRole('button', { name: 'Eliminar cuenta' }).click();
	await page
		.getByRole('alertdialog')
		.getByRole('button', { name: 'Eliminar', exact: true })
		.click();
	await expect(page.getByText('La contraseña no es correcta.')).toBeVisible();
	await expect(page).toHaveURL(/\/profile\/delete$/);
	await page.goto('/');
	await expect(page).toHaveURL(/\/$/);

	await page.goto('/profile/delete', { waitUntil: 'networkidle' });
	await page.locator('#delete-password').fill(password);
	await page.getByRole('button', { name: 'Eliminar cuenta' }).click();
	await page
		.getByRole('alertdialog')
		.getByRole('button', { name: 'Eliminar', exact: true })
		.click();
	await expect(page).toHaveURL(/\/login/);

	await page.goto('/');
	await expect(page).toHaveURL(/\/login/);
	await submitLogin(page, email, password);
	await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible();
});
