import { expect, test } from '@playwright/test';
import { es } from '../src/lib/copy/es';
import { login, withDb } from './helpers';

test('creating a category without an icon is rejected', async ({ page, baseURL }) => {
	await login(page);
	const name = `Sin icono ${Date.now()}`;
	const res = await page.request.post('/categories/new', {
		form: { name, color: 'green', kind: '' },
		headers: { origin: baseURL!, 'x-sveltekit-action': 'true' }
	});
	const body = await res.json();
	expect(body.type).toBe('failure');
	expect(body.data).toContain(es.common.fields.pickIcon);

	const rows = await withDb((sql) => sql`select id from categories where name = ${name}`);
	expect(rows).toHaveLength(0);
});
