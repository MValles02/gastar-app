import { expect, test, type Browser, type Page } from '@playwright/test';
import { firstDetailHref, login, OTHER_EMAIL, SEED_EMAIL } from './helpers';

// Cross-user isolation: the seeded user B (`otro`) against the demo user A's account and movement.
// Only rejected writes are posted, so A's data is never changed.

const post = (page: Page, baseURL: string, path: string, form: Record<string, string>) =>
	page.request.post(path, {
		form,
		headers: { origin: baseURL, accept: 'application/json' }
	});

/** A's first account/movement detail path, and the text A sees there. */
async function demoDetail(browser: Browser, baseURL: string, entity: 'accounts' | 'movements') {
	const context = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		await login(page, SEED_EMAIL);
		const path = (await firstDetailHref(page, entity, entity === 'movements' ? '?all=1' : ''))!;
		expect(path).toBeTruthy();
		// hydration guard: the rendered text differs before and after hydration.
		await page.goto(path, { waitUntil: 'networkidle' });
		return { path, text: await page.locator('main').innerText() };
	} finally {
		await context.close();
	}
}

async function expectUnchanged(browser: Browser, baseURL: string, path: string, text: string) {
	const context = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		await login(page, SEED_EMAIL);
		const res = await page.goto(path, { waitUntil: 'networkidle' });
		expect(res!.status()).toBe(200);
		expect(await page.locator('main').innerText()).toBe(text);
	} finally {
		await context.close();
	}
}

for (const [entity, update] of [
	['accounts', { name: 'Hackeada' }],
	['movements', { description: 'Hackeado' }]
] as const) {
	test(`another user cannot read or write the demo user's ${entity}`, async ({
		page,
		browser,
		baseURL
	}) => {
		const { path, text } = await demoDetail(browser, baseURL!, entity);

		await login(page, OTHER_EMAIL);
		expect((await page.goto(path))!.status()).toBe(404);
		expect((await post(page, baseURL!, `${path}?/update`, update)).status()).toBe(404);
		expect((await post(page, baseURL!, `${path}?/delete`, {})).status()).toBe(404);

		await expectUnchanged(browser, baseURL!, path, text);
	});
}
