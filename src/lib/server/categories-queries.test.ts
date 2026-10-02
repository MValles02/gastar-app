import { expect, it } from 'vitest';
import {
	categoryMonthNet,
	categoryNameTaken,
	categoryReferenced,
	createCategory,
	deleteCategory,
	getCategory,
	hasAnyCategory,
	listCategories,
	setCategoryArchived,
	updateCategory
} from './categories-queries';

const id = '123e4567-e89b-12d3-a456-426614174000';
const data = { name: 'x', color: 'green' };
const range = { start: new Date('2026-10-01T03:00:00Z'), end: new Date('2026-11-01T03:00:00Z') };

const builders = (u: string) => [
	listCategories(u),
	listCategories(u, { q: 'a', archived: true }),
	hasAnyCategory(u),
	getCategory(u, id),
	categoryReferenced(u, id),
	categoryNameTaken(u, 'x'),
	categoryNameTaken(u, 'x', id),
	categoryMonthNet(u, id, range),
	createCategory(u, data),
	updateCategory(u, id, data),
	deleteCategory(u, id),
	setCategoryArchived(u, id, null)
];

it('every query is scoped by categories.user_id with the userId as a param', () => {
	for (const q of builders('user-a')) {
		const { sql, params } = q.toSQL();
		expect(sql).toContain('"user_id"');
		expect(params).toContain('user-a');
	}
	for (const q of builders('user-b')) {
		expect(q.toSQL().params).toContain('user-b');
		expect(q.toSQL().params).not.toContain('user-a');
	}
	for (const q of builders('u').filter((_, i) => i !== 8)) {
		expect(q.toSQL().sql).toContain('"categories"."user_id"');
	}
});

it('by-id builders combine id with the owner check in WHERE', () => {
	for (const q of [
		getCategory('u', id),
		updateCategory('u', id, data),
		deleteCategory('u', id),
		setCategoryArchived('u', id, new Date())
	]) {
		const { sql, params } = q.toSQL();
		expect(sql).toMatch(/where .*"id" = \$.*"user_id" = \$/is);
		expect(params).toContain(id);
	}
});

it('listCategories hides archived by default, escapes q and orders by name', () => {
	expect(listCategories('u').toSQL().sql).toContain('"archived_at" is null');
	expect(listCategories('u', { archived: true }).toSQL().sql).not.toContain('archived_at" is null');
	const { sql, params } = listCategories('u', { q: '50%_' }).toSQL();
	expect(sql).toMatch(/ilike/i);
	expect(params).toContain('%50\\%\\_%');
	expect(sql).toMatch(/order by "categories"."name" asc/i);
});

it('hasAnyCategory has no archived filter and limits to 1', () => {
	const { sql } = hasAnyCategory('u').toSQL();
	expect(sql).not.toContain('archived_at');
	expect(sql).toMatch(/limit/i);
});

it('categoryMonthNet checks both owners, the range and groups by currency', () => {
	const { sql, params } = categoryMonthNet('user-a', id, range).toSQL();
	expect(sql).toContain('"financial_accounts"."owner_id"');
	expect(sql).toContain('"categories"."user_id"');
	expect(sql).toContain('"occurred_at" >=');
	expect(sql).toContain('"occurred_at" <');
	expect(sql).toMatch(/group by "financial_accounts"."currency"/i);
	expect(params).toContain('user-a');
});

it('categoryNameTaken compares lower() and excludes an id only when given', () => {
	const a = categoryNameTaken('u', 'Comida').toSQL();
	expect(a.sql).toContain('lower(');
	expect(a.sql).not.toContain('<>');
	const b = categoryNameTaken('u', 'Comida', id).toSQL();
	expect(b.sql).toContain('<>');
	expect(b.params).toContain(id);
});
