import { expect, test } from '@playwright/test';
import { es } from '../src/lib/copy/es';
import { login, postAction, withDb } from './helpers';

test('creating a category without an icon is rejected', async ({ page, baseURL }) => {
	await login(page);
	const name = `Sin icono ${Date.now()}`;
	const res = await postAction(page, baseURL!, '/categories/new', {
		name,
		color: 'green',
		kind: ''
	});
	const body = await res.json();
	expect(body.type).toBe('failure');
	expect(body.data).toContain(es.common.fields.pickIcon);

	const rows = await withDb((sql) => sql`select id from categories where name = ${name}`);
	expect(rows).toHaveLength(0);
});
