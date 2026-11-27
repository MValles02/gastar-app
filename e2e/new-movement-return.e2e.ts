// The /movements/new action redirects to the same origin (from the Referer); any other returnTo falls
// back to the form itself.
import { expect, test } from '@playwright/test';
import { deleteMovements, idByName, login, OTHER_EMAIL, todayInAppTz, unique } from './helpers';

const created: string[] = [];

test.beforeEach(async ({ page }) => {
	await login(page, OTHER_EMAIL);
});

test.afterEach(async ({ page, baseURL }) => {
	for (const prefix of created.splice(0)) await deleteMovements(page, baseURL!, prefix);
});

test('an external or crafted returnTo falls back to the form', async ({ page, baseURL }) => {
	const accountId = await idByName('financial_accounts', OTHER_EMAIL, 'Otra cuenta pesos');
	const categoryId = await idByName('categories', OTHER_EMAIL, 'Ajena');
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
				description: unique(created, 'Origen ajeno'),
				accountId,
				categoryId,
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
