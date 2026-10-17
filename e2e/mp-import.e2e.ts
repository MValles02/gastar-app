import { expect, test, type Page } from '@playwright/test';
import { IMPORT_EMAIL, login, OTHER_EMAIL, SEED_EMAIL } from './helpers';

const FAKE = 'http://127.0.0.1:5199';
const TOKEN = 'TEST-fake-mp-token';

test.describe.configure({ mode: 'serial' });

let page: Page;

const rows = () => page.locator('[data-slot="item-group"] [role="listitem"]');
const fake = (path: string, body?: unknown) =>
	fetch(FAKE + path, {
		method: body === undefined ? 'GET' : 'POST',
		body: body === undefined ? undefined : JSON.stringify(body)
	});
const calls = async () =>
	(await (await fake('/__fake/requests')).json()) as {
		method: string;
		path: string;
		authorization: string | null;
	}[];
const reportRequests = async () =>
	(await calls()).filter((r) => r.method === 'POST' && r.path === '/v1/account/release_report')
		.length;

/** Clicks "Sincronizar ahora" and reloads until the run is over (the lease is taken before the redirect). */
async function syncNow(expected: RegExp) {
	await page.goto('/imports', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Sincronizar ahora' }).click();
	await expect(async () => {
		await page.reload();
		await expect(page.getByRole('status')).toHaveText(expected);
	}).toPass({ timeout: 30_000, intervals: [300, 500, 1000] });
}

const accountRow = async () => {
	await page.goto('/accounts', { waitUntil: 'networkidle' });
	return (await page.getByRole('link', { name: /Mercado Pago/ }).textContent())!.trim();
};

test.beforeAll(async ({ browser }) => {
	await fake('/__fake/reset', {});
	page = await browser.newPage();
	await login(page, IMPORT_EMAIL);
	const origin = new URL(page.url()).origin;
	const res = await page.request.post('/dev/mp-reset', { headers: { origin } });
	expect(res.status()).toBe(204);
});

test.afterAll(async () => {
	await page.close();
});

test('sync fills the inbox and leaves balances alone', async () => {
	const balance = await accountRow();

	await syncNow(/Última sincronización/);
	await expect(rows()).toHaveCount(6);
	const main = page.locator('main');
	await expect(main.getByText('FAKE.AMIGA')).toBeVisible();
	await expect(main.getByText('CAFE DE PRUEBA')).toBeVisible();
	await expect(main.getByText('Ingreso de dinero')).toBeVisible();
	await expect(main.getByText('Retiro')).toBeVisible();
	await expect(main.getByText('Rendimientos')).toHaveCount(2);
	await expect(main.getByText(/reserve/i)).toHaveCount(0);

	expect(await accountRow()).toBe(balance);

	await page.goto('/profile', { waitUntil: 'networkidle' });
	await expect(page.getByRole('link', { name: /Mercado Pago/ })).toContainText('6');
});

test('a second sync keeps the same items', async () => {
	const before = await reportRequests();
	await syncNow(/Última sincronización/);
	expect(await reportRequests()).toBe(before + 1);
	await expect(rows()).toHaveCount(6);
});

test('an auth failure shows the sync error', async () => {
	await fake('/__fake/status', { status: 401 });
	try {
		await syncNow(/No se pudo sincronizar/);
	} finally {
		await fake('/__fake/status', { status: null });
	}
});

test('every MP call carries the bearer token', async () => {
	const all = await calls();
	expect(all.length).toBeGreaterThan(0);
	for (const c of all) expect(c.authorization).toBe(`Bearer ${TOKEN}`);
});

test('other users get 404 and no Perfil row', async ({ browser }) => {
	for (const email of [OTHER_EMAIL, SEED_EMAIL]) {
		const ctx = await browser.newContext();
		const p = await ctx.newPage();
		await login(p, email);
		expect((await p.goto('/imports'))!.status()).toBe(404);
		await p.goto('/profile', { waitUntil: 'networkidle' });
		await expect(p.getByRole('link', { name: /Mercado Pago/ })).toHaveCount(0);
		await ctx.close();
	}
});
