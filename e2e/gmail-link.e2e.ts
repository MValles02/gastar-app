import { expect, test, type Page } from '@playwright/test';
import { FAKE_GMAIL } from './fakes.js';
import { GALICIA_EMAIL, login, OTHER_EMAIL, post } from './helpers';

// Google is the fake in e2e/fake-gmail.js. User A is the seeded Galicia user (no other spec links Gmail),
// so the spec adds no sign-up or email verification to the suite's rate-limit budget.
const GMAIL_PATH = '/profile/gmail';
const stamp = Date.now();
const gmailA = `gmail-a-${stamp}@gastar.local`;

test.describe.configure({ mode: 'serial' });

let page: Page;

const fake = (path: string) => fetch(FAKE_GMAIL.url + path);
const revokeCalls = async () =>
	((await (await fake('/__fake/requests')).json()) as { path: string }[]).filter(
		(r) => r.path === '/revoke'
	).length;
const gmailRow = (p: Page) => p.getByRole('link', { name: /Gmail/ });
// "Vincular" without matching "Vinculado".
const UNLINKED = /Vincular(?!do)/;

// Revokes before the first test: a rerun's leftover link revokes at the fake when beforeAll unlinks it.
let revokesBefore = 0;

test.beforeAll(async ({ browser, baseURL }) => {
	await fake('/__fake/reset');
	await fake(`/__fake/account?email=${encodeURIComponent(gmailA)}`);
	const context = await browser.newContext({ baseURL });
	page = await context.newPage();
	await login(page, GALICIA_EMAIL);
	// A rerun on a reused DB starts unlinked (the unlink action is a no-op without a row).
	await post(page, baseURL!, `${GMAIL_PATH}?/disconnect`, {});
	revokesBefore = await revokeCalls();
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
	await expect(gmailRow(page)).toContainText(UNLINKED);

	await link('Vincular Gmail');
	await expect(page.getByText(gmailA)).toBeVisible();
	await page.goto('/profile/vinculaciones');
	await expect(gmailRow(page)).toContainText('Vinculado');

	await page.goto(GMAIL_PATH);
	await page.waitForLoadState('networkidle'); // hydration guard: the disconnect confirm dialog needs JS
	await page.getByRole('button', { name: 'Desvincular' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Desvincular' }).click();
	await expect(page.getByRole('button', { name: 'Vincular Gmail' })).toBeVisible();
	expect(await revokeCalls()).toBe(revokesBefore + 1);
	await page.goto('/profile/vinculaciones');
	await expect(gmailRow(page)).toContainText(UNLINKED);
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
		await expect(gmailRow(other)).toContainText(UNLINKED);
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
