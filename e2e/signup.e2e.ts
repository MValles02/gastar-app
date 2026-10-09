import { expect, test, type Page } from '@playwright/test';
import { latestMail, waitForLink } from './outbox';

// Rate limits are in-memory (sign-up 10/h/IP, reset 5/15min/IP, 3/15min/email, resend 5/15min/IP).
// One full run uses 3 sign-ups (1 hour window) and 2 reset requests (15 min window), so re-running
// the suite more than 3 times within an hour can hit them; restarting the dev server resets the counters.
const seededEmail = process.env.SEED_EMAIL || 'demo@gastar.local';
const password = 'e2e-pass-1234';
let n = 0;
const uniqueEmail = () => `e2e+${Date.now()}-${n++}@gastar.local`;

async function signUp(page: Page, email: string) {
	await page.goto('/signup', { waitUntil: 'networkidle' });
	await page.getByLabel('Nombre').fill('E2E');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Contraseña', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Crear cuenta' }).click();
	await expect(page.getByRole('heading', { name: 'Revisá tu email' })).toBeVisible();
}

async function logIn(page: Page, email: string, pass: string) {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Contraseña', { exact: true }).fill(pass);
	await page.getByRole('button', { name: 'Ingresar' }).click();
}

test('sign-up requires email verification before signing in', async ({ page, request }) => {
	const email = uniqueEmail();
	await signUp(page, email);
	const { link } = await waitForLink(request, email, /Confirmá/);

	await logIn(page, email, password);
	await expect(page.getByRole('heading', { name: 'Revisá tu email' })).toBeVisible();
	await expect(page).not.toHaveURL(/\/$/);

	await page.goto(link);
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { level: 1, name: /^Hola, / })).toBeAttached();
});

test('password reset by link', async ({ page, request }) => {
	const email = uniqueEmail();
	await signUp(page, email);
	await page.goto((await waitForLink(request, email, /Confirmá/)).link);
	await expect(page).toHaveURL(/\/$/);
	await page.context().clearCookies();

	await page.goto('/forgot-password', { waitUntil: 'networkidle' });
	await page.getByLabel('Email').fill(email);
	await page.getByRole('button', { name: 'Enviar enlace' }).click();
	await expect(page.getByRole('heading', { name: 'Revisá tu email' })).toBeVisible();

	const { link } = await waitForLink(request, email, /Restablecé/);
	await page.goto(link);
	await expect(page).toHaveURL(/\/reset-password\?token=/);
	await page.waitForLoadState('networkidle');
	const newPassword = 'e2e-new-pass-5678';
	await page.getByLabel('Contraseña', { exact: true }).fill(newPassword);
	await page.getByRole('button', { name: 'Guardar' }).click();

	await expect(page).toHaveURL(/\/login/);
	await expect(page.getByText('Contraseña actualizada.')).toBeVisible();

	await logIn(page, email, newPassword);
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { level: 1, name: /^Hola, / })).toBeAttached();
});

test('reset and sign-up do not reveal which emails exist', async ({ page, request }) => {
	const unknown = uniqueEmail();
	await page.goto('/forgot-password', { waitUntil: 'networkidle' });
	await page.getByLabel('Email').fill(unknown);
	await page.getByRole('button', { name: 'Enviar enlace' }).click();
	await expect(page.getByRole('heading', { name: 'Revisá tu email' })).toBeVisible();
	expect(await latestMail(request, unknown)).toBeNull();

	// A stale entry from an earlier run must not satisfy the assertion: require a newer id.
	const beforeId = (await latestMail(request, seededEmail))?.id ?? 0;
	await signUp(page, seededEmail);
	await expect
		.poll(async () => {
			const mail = await latestMail(request, seededEmail);
			return mail !== null && mail.id > beforeId && /Ya tenés una cuenta/.test(mail.subject);
		})
		.toBe(true);
});

test('expired links show "Enlace vencido"', async ({ page }) => {
	for (const url of ['/reset-password?error=INVALID_TOKEN', '/verify-email?error=TOKEN_EXPIRED']) {
		await page.goto(url);
		await expect(page.getByRole('heading', { name: 'Enlace vencido' })).toBeVisible();
	}
});
