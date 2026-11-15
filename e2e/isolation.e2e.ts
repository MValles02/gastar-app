import { expect, test, type Browser } from '@playwright/test';
import { login, OTHER_EMAIL, pathOf, post, SEED_EMAIL } from './helpers';

// Cross-user isolation: the seeded user B (`otro`) against the demo user A's account and movement.
// Only rejected writes are posted, so A's data is never changed. The targets are seeded rows no other
// spec writes: the account "Ahorro USD" and the "Compra de dólares" transfer (name and amount in the list row).

const TARGETS = {
	accounts: { list: '/accounts', name: /Ahorro USD/ },
	movements: { list: '/movements?q=Compra+de+d%C3%B3lares&all=1', name: /Compra de dólares/ }
} as const;

/** A's row for the target on its list page: the detail path and the row text (name/description, amount). */
async function demoRow(
	browser: Browser,
	baseURL: string,
	entity: keyof typeof TARGETS,
	path?: string
) {
	const context = await browser.newContext({ baseURL });
	try {
		const page = await context.newPage();
		await login(page, SEED_EMAIL);
		await page.goto(TARGETS[entity].list);
		const row = path
			? page.locator(`main a[href$="${path}"]`)
			: page
					.locator(`main a[href*="${entity}/"]`)
					.filter({ hasText: TARGETS[entity].name })
					.first();
		return { path: path ?? (await pathOf(row)), text: await row.innerText() };
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
		const { path, text } = await demoRow(browser, baseURL!, entity);

		await login(page, OTHER_EMAIL);
		expect((await page.goto(path))!.status()).toBe(404);
		expect((await post(page, baseURL!, `${path}?/update`, update)).status()).toBe(404);
		expect((await post(page, baseURL!, `${path}?/delete`, {})).status()).toBe(404);

		expect((await demoRow(browser, baseURL!, entity, path)).text).toBe(text);
	});
}
