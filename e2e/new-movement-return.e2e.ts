// Without JS the /movements/new action redirects to the same origin (from the Referer); any other
// returnTo falls back to the form itself.
import { expect, test, type Page } from '@playwright/test';
import { deleteMovements, login, OTHER_EMAIL, todayInAppTz } from './helpers';

const created: string[] = [];
const unique = (prefix: string) => {
	const d = `${prefix} ${Date.now()}`;
	created.push(d);
	return d;
};

test.beforeEach(async ({ page }) => {
	await login(page, OTHER_EMAIL);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	const option = (page: Page, group: 'Cuenta' | 'Categoría', name: RegExp) =>
		page.getByRole('group', { name: group, exact: true }).getByRole('radio', { name });

	test('an external or crafted returnTo falls back to the form', async ({ page, baseURL }) => {
		await page.goto('/movements/new');
		const accountId = await option(page, 'Cuenta', /Otra cuenta pesos/).getAttribute('value');
		const categoryId = await option(page, 'Categoría', /Ajena/).getAttribute('value');
		for (const returnTo of [
			'https://evil.example/plan',
			'//evil.example/plan',
			'/\\evil.example/plan',
			'/.//evil.example/plan',
			'/a/..//evil.example/plan',
			'plan',
			'/movements/new',
			'/movements/new/',
			'/movements/%6Eew'
		]) {
			const res = await page.request.post('/movements/new', {
				form: {
					type: 'outcome',
					amount: '1',
					description: unique('Origen ajeno'),
					accountId: accountId!,
					categoryId: categoryId!,
					occurredAt: todayInAppTz(),
					returnTo
				},
				headers: { origin: baseURL!, accept: 'text/html' },
				maxRedirects: 0
			});
			expect(res.status(), returnTo).toBe(303);
			expect(res.headers().location, returnTo).toMatch(/^\/movements\/new\?saved=[0-9a-f-]{36}$/);
		}
	});
});
