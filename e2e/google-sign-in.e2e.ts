import { expect, test, type Page } from '@playwright/test';
import { createAccount, gotoHydrated, submitLogin, signUpVerified, withDb } from './helpers';
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

/** Answers the fake Google consent page that "Confirmar con Google" leads to. */
async function answerGoogle(page: Page, email: string) {
	await page.getByLabel('Email', { exact: true }).fill(email);
	await page.getByLabel('Name', { exact: true }).fill('Google E2E');
	await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

/** Makes the user's sessions look 10 minutes old, past the 5 minutes a password-less user may act in. */
const ageSession = (email: string) =>
	withDb(
		(sql) => sql`update session set created_at = now() - interval '10 minutes'
			where user_id = (select id from "user" where email = ${email})`
	);

test('a Google-only user creates a password after confirming with Google and then signs in with it', async ({
	page
}) => {
	const email = uniqueEmail();
	await continueWithGoogle(page, { email });
	await expectHome(page);

	await gotoHydrated(page, '/profile/password');
	await expect(page.getByRole('heading', { name: 'Crear contraseña' })).toBeVisible();
	await ageSession(email);
	await page.getByLabel('Contraseña nueva').fill(password);
	await page.getByRole('button', { name: 'Guardar' }).click();

	await expect(page.getByRole('alert')).toContainText('confirmá con Google antes de crear');
	const credentials = await withDb(
		(sql) => sql`select 1 from account a join "user" u on u.id = a.user_id
			where u.email = ${email} and a.provider_id = 'credential'`
	);
	expect(credentials).toHaveLength(0);

	await page.getByRole('button', { name: 'Confirmar con Google' }).click();
	await answerGoogle(page, email);
	// The return URL is the drawer's: it opens over Perfil.
	await expect(page).toHaveURL(/\/profile$/);
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.getByLabel('Contraseña nueva').fill(password);
	await page.getByRole('button', { name: 'Guardar' }).click();
	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(page).toHaveURL(/\/profile$/);

	await page.context().clearCookies();
	await submitLogin(page, email, password);
	await expectHome(page);
});

test('a Google-only user deletes the account only after confirming with Google', async ({
	page,
	baseURL
}) => {
	const email = uniqueEmail();
	await continueWithGoogle(page, { email });
	await expectHome(page);
	await createAccount(page, baseURL!, `Cuenta baja ${Date.now()}`, 'ARS');
	const [{ id: userId }] = await withDb((sql) => sql`select id from "user" where email = ${email}`);

	await gotoHydrated(page, '/profile/delete');
	await expect(page.getByText(`Cuenta: ${email}`)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Darme de baja' })).toBeEnabled();
	await ageSession(email);
	await page.getByRole('button', { name: 'Darme de baja' }).click();

	await expect(page.getByRole('alert')).toContainText('Pasaron más de 5 minutos');
	const kept = await withDb(
		(sql) => sql`select
			(select count(*) from "user" where id = ${userId})::int as users,
			(select count(*) from financial_accounts where owner_id = ${userId})::int as accounts`
	);
	expect(kept).toEqual([{ users: 1, accounts: 1 }]);

	await page.getByRole('button', { name: 'Confirmar con Google' }).click();
	await answerGoogle(page, email);
	await expect(page).toHaveURL(/\/profile$/);
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.getByRole('button', { name: 'Darme de baja' }).click();
	await expect(page).toHaveURL(/\/login/);

	const left = await withDb(
		(sql) => sql`select
			(select count(*) from "user" where id = ${userId})::int as users,
			(select count(*) from financial_accounts where owner_id = ${userId})::int as accounts`
	);
	expect(left).toEqual([{ users: 0, accounts: 0 }]);
});
