import { expect, test } from '@playwright/test';
import { es } from '../src/lib/copy/es';
import { idByName, login, postAction, SEED_EMAIL } from './helpers';

const MISMATCH = es.movements.errors.kindMismatch.income;

test('an income category is rejected for an expense and nothing is saved', async ({
	page,
	baseURL
}) => {
	await login(page);
	const accountId = await idByName('financial_accounts', SEED_EMAIL, 'Banco Galicia');
	const categoryId = await idByName('categories', SEED_EMAIL, 'Sueldo');
	const desc = `Tipo cruzado ${Date.now()}`;

	const res = await postAction(page, baseURL!, '/movements/new', {
		type: 'outcome',
		occurredAt: '2024-02-27',
		description: desc,
		amount: '1',
		accountId,
		categoryId
	});
	const body = await res.json();
	expect(body.type).toBe('failure');
	expect(body.status).toBe(400);
	expect(body.data).toContain(MISMATCH);

	await page.goto(`/movements?q=${encodeURIComponent(desc)}`);
	await expect(page.getByText(desc)).toHaveCount(0);
});
