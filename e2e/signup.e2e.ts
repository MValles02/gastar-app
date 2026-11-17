import { expect, test, type Page } from '@playwright/test';
import { SEED_EMAIL, submitLogin } from './helpers';
import { latestMail, waitForLink } from './outbox';

// Rate limits are in-memory (sign-up 50/h/IP in e2e builds, reset 3/15min, resend 3/15min).
// The full suite makes 12 sign-ups (this file 3, see signUpVerified in helpers.ts); this file also makes 2 reset requests (15 min window),
// so re-running it within 15 minutes can hit the reset limit; restarting the server resets the counters.
const password = 'e2e-pass-1234';
let n = 0;
const uniqueEmail = () => `e2e+${Date.now()}-${n++}@gastar.local`;

const expectCheckEmail = (page: Page) =>
	expect(page.getByRole('heading', { name: 'Revisá tu email' })).toBeVisible();

async function signUp(page: Page, email: string) {
	await page.goto('/signup');
	await page.getByLabel('Nombre').fill('E2E');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Contraseña', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Crear cuenta' }).click();
	await expectCheckEmail(page);
}

async function requestReset(page: Page, email: string) {
	await page.goto('/forgot-password');
	await page.getByLabel('Email').fill(email);
	await page.getByRole('button', { name: 'Enviar enlace' }).click();
	await expectCheckEmail(page);
}

const expectHome = async (page: Page) => {
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { level: 1, name: /^Hola, / })).toBeAttached();
};

test('sign-up requires email verification before signing in', async ({ page, request }) => {
	const email = uniqueEmail();
	await signUp(page, email);
	const { link } = await waitForLink(request, email, /Confirmá/);

	await submitLogin(page, email, password);
	await expectCheckEmail(page);
	await expect(page).not.toHaveURL(/\/$/);

	await page.goto(link);
	await expectHome(page);
});

test('password reset by link', async ({ page, request }) => {
	const email = uniqueEmail();
	await signUp(page, email);
	await page.goto((await waitForLink(request, email, /Confirmá/)).link);
	await expect(page).toHaveURL(/\/$/);
	await page.context().clearCookies();

	await requestReset(page, email);

	const { link } = await waitForLink(request, email, /Restablecé/);
	await page.goto(link);
	await expect(page).toHaveURL(/\/reset-password\?token=/);
	await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
	const newPassword = 'e2e-new-pass-5678';
	await page.getByLabel('Contraseña', { exact: true }).fill(newPassword);
	await page.getByRole('button', { name: 'Guardar' }).click();

	await expect(page).toHaveURL(/\/login/);
	await expect(page.getByText('Contraseña actualizada.')).toBeVisible();

	await submitLogin(page, email, newPassword);
	await expectHome(page);
});

test('reset and sign-up do not reveal which emails exist', async ({ page, request }) => {
	const unknown = uniqueEmail();
	await requestReset(page, unknown);
	expect(await latestMail(request, unknown)).toBeNull();

	// A stale entry from an earlier run must not satisfy the assertion: require a newer id.
	const beforeId = (await latestMail(request, SEED_EMAIL))?.id ?? 0;
	await signUp(page, SEED_EMAIL);
	await expect
		.poll(async () => {
			const mail = await latestMail(request, SEED_EMAIL);
			return mail !== null && mail.id > beforeId && /Ya tenés una cuenta/.test(mail.subject);
		})
		.toBe(true);
});

test('an invalid or expired link shows "Enlace vencido" and offers no new password', async ({
	page
}) => {
	for (const url of ['/reset-password?error=INVALID_TOKEN', '/verify-email?error=TOKEN_EXPIRED']) {
		await page.goto(url);
		await expect(page.getByRole('heading', { name: 'Enlace vencido' })).toBeVisible();
		await expect(page.getByLabel('Contraseña', { exact: true })).toHaveCount(0);
		await expect(page).not.toHaveURL(/\/$/);
	}
});
