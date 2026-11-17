import { expect, test, type Page } from '@playwright/test';
import { login, OTHER_EMAIL, post, signUpVerified } from './helpers';

// Google is the fake in e2e/fake-gmail.js. This spec uses 1 sign-up (see signUpVerified for the suite's budget).
const FAKE = `http://127.0.0.1:${Number(process.env.FAKE_GMAIL_PORT) || 5197}`;
const GMAIL_PATH = '/profile/gmail';
const stamp = Date.now();
const emailA = `e2e+gmail-${stamp}@gastar.local`;
const gmailA = `gmail-a-${stamp}@gastar.local`;

test.describe.configure({ mode: 'serial' });

let page: Page;

const fake = (path: string) => fetch(FAKE + path);
const revokeCalls = async () =>
	((await (await fake('/__fake/requests')).json()) as { path: string }[]).filter(
		(r) => r.path === '/revoke'
	).length;
const gmailRow = (p: Page) => p.getByRole('link', { name: /Gmail/ });

test.beforeAll(async ({ browser, baseURL }) => {
	await fake('/__fake/reset');
	await fake(`/__fake/account?email=${encodeURIComponent(gmailA)}`);
	const context = await browser.newContext({ baseURL });
	page = await context.newPage();
	await signUpVerified(page, context.request, {
		email: emailA,
		password: 'e2e-pass-1234',
		name: 'Gmail E2E'
	});
});

test.afterAll(async () => {
	await page.context().close();
});

/** Starts the link from /profile/gmail; the fake approves at once and the callback lands back here. */
async function link(buttonName: string) {
	await page.goto(GMAIL_PATH);
	await page.getByRole('button', { name: buttonName }).click();
	await expect(page).toHaveURL(/\/profile\/gmail\?linked=1$/);
}

test('linking shows Vinculado and the address; unlinking revokes at Google', async () => {
	await page.goto('/profile/vinculaciones');
	await expect(gmailRow(page)).toContainText('Vincular');

	await link('Vincular Gmail');
	await expect(page.getByText(gmailA)).toBeVisible();
	await page.goto('/profile/vinculaciones');
	await expect(gmailRow(page)).toContainText('Vinculado');

	await page.goto(GMAIL_PATH);
	await page.waitForLoadState('networkidle'); // hydration guard: the disconnect confirm dialog needs JS
	await page.getByRole('button', { name: 'Desvincular' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Desvincular' }).click();
	await expect(page.getByRole('button', { name: 'Vincular Gmail' })).toBeVisible();
	expect(await revokeCalls()).toBe(1);
	await page.goto('/profile/vinculaciones');
	await expect(gmailRow(page)).toContainText('Vincular');
});

test('a revoked grant asks to reconnect, and reconnecting links again', async ({ baseURL }) => {
	await link('Vincular Gmail');
	await fake('/__fake/revoke');
	const res = await post(page, baseURL!, '/dev/gmail-refresh', {});
	expect(await res.text()).toBe('reconnect');

	await page.goto('/profile/vinculaciones');
	await expect(gmailRow(page)).toContainText('Reconectar');
	await link('Reconectar');
	await page.goto('/profile/vinculaciones');
	await expect(gmailRow(page)).toContainText('Vinculado');
});

test('a consent without permission to read mail is rejected and nothing is linked', async () => {
	await page.goto(GMAIL_PATH);
	await page.waitForLoadState('networkidle'); // hydration guard: the disconnect confirm dialog needs JS
	await page.getByRole('button', { name: 'Desvincular' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Desvincular' }).click();
	await expect(page.getByRole('button', { name: 'Vincular Gmail' })).toBeVisible();

	await fake('/__fake/omit-scope');
	await page.getByRole('button', { name: 'Vincular Gmail' }).click();
	await expect(page).toHaveURL(/error=scope/);
	await expect(
		page.getByText('Para vincular Gmail tenés que permitir que Gastar lea tus mails.')
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Vincular Gmail' })).toBeVisible();
});

test("another user sees their own state and cannot touch the first user's link", async ({
	browser,
	baseURL
}) => {
	await link('Vincular Gmail');

	const ctx = await browser.newContext({ baseURL });
	try {
		const other = await ctx.newPage();
		await login(other, OTHER_EMAIL);
		await other.goto('/profile/vinculaciones');
		await expect(gmailRow(other)).toContainText('Vincular');
		await other.goto(GMAIL_PATH);
		await expect(other.getByText(gmailA)).toHaveCount(0);
		expect(await (await post(other, baseURL!, '/dev/gmail-refresh', {})).text()).toBe('reconnect');
		await post(other, baseURL!, `${GMAIL_PATH}?/disconnect`, {});
	} finally {
		await ctx.close();
	}

	// The other user's refresh and unlink found no row of their own, so the first user's link is untouched.
	await page.goto('/profile/vinculaciones');
	await expect(gmailRow(page)).toContainText('Vinculado');
});
