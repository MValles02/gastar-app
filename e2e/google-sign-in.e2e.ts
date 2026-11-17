import { expect, test, type Page } from '@playwright/test';
import { createAccount, submitLogin, signUpVerified, withDb } from './helpers';
import { latestMail } from './outbox';

// Google is the fake in e2e/fake-google.js: its /authorize page asks for the profile to answer with.
const password = 'e2e-pass-1234';
let n = 0;
const uniqueEmail = () => `e2e+google-${Date.now()}-${n++}@gastar.local`;

const GENERIC_ERROR = 'No pudimos entrar con Google. Probá de nuevo.';

/** Clicks "Continuar con Google" on /login and answers the fake consent page. */
async function continueWithGoogle(
	page: Page,
	o: { email: string; name?: string; verified?: boolean }
) {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Continuar con Google' }).click();
	await page.getByLabel('Email', { exact: true }).fill(o.email);
	await page.getByLabel('Name', { exact: true }).fill(o.name ?? 'Google E2E');
	await page.getByLabel('Email verified').setChecked(o.verified ?? true);
	await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

const expectHome = (page: Page) => expect(page).toHaveURL(/\/$/);

test('a new Google user lands signed in on Inicio without a verification email', async ({
	page,
	request
}) => {
	const email = uniqueEmail();
	await continueWithGoogle(page, { email, name: 'G'.repeat(120) });

	await expectHome(page);
	await expect(page.getByRole('heading', { level: 1, name: /^Hola, / })).toBeAttached();
	expect(await latestMail(request, email)).toBeNull();
	// The id_token (email, name, picture) is not persisted.
	const rows = await withDb(
		(sql) => sql`select a.id_token from account a join "user" u on u.id = a.user_id
			where u.email = ${email} and a.provider_id = 'google'`
	);
	expect(rows).toEqual([{ id_token: null }]);
});

test('Google joins a verified password account with the same email', async ({
	page,
	request,
	baseURL
}) => {
	const email = uniqueEmail();
	await signUpVerified(page, request, { email, password, name: 'E2E Google' });
	const account = `Cuenta Google ${Date.now()}`;
	await createAccount(page, baseURL!, account, 'ARS');
	await page.context().clearCookies();

	await continueWithGoogle(page, { email });
	await expectHome(page);
	await page.goto('/accounts');
	await expect(page.getByText(account)).toBeVisible();

	await page.context().clearCookies();
	await submitLogin(page, email, password);
	await expectHome(page);
});

test('Google does not join an unverified password account', async ({ page }) => {
	const email = uniqueEmail();
	await page.goto('/signup');
	await page.getByLabel('Nombre').fill('E2E');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Contraseña', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Crear cuenta' }).click();
	await expect(page.getByRole('heading', { name: 'Revisá tu email' })).toBeVisible();

	await continueWithGoogle(page, { email });

	await expect(page).toHaveURL(/\/login\?error=/);
	await expect(page.getByRole('alert')).toContainText(
		'Ya hay una cuenta con ese email sin verificar.'
	);
	await page.goto('/');
	await expect(page).toHaveURL(/\/login/);
});

test('Google with an unverified email creates nothing', async ({ page }) => {
	const email = uniqueEmail();
	await continueWithGoogle(page, { email, verified: false });

	await expect(page).toHaveURL(/\/login\?error=/);
	await expect(page.getByRole('alert')).toHaveText(GENERIC_ERROR);
	await page.goto('/');
	await expect(page).toHaveURL(/\/login/);
	const rows = await withDb((sql) => sql`select 1 from "user" where email = ${email}`);
	expect(rows).toHaveLength(0);
});
