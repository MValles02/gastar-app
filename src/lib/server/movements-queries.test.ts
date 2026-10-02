import { expect, it } from 'vitest';
import {
	createMovement,
	deleteMovement,
	getMovement,
	listMovements,
	updateMovement
} from './movements-queries';
import { parseMovementFilters } from './movements';

const row = {
	type: 'outcome' as const,
	occurredAt: new Date('2026-10-01T12:00:00Z'),
	description: 'x',
	amount: 100,
	accountId: '123e4567-e89b-12d3-a456-426614174000',
	destinationAccountId: null,
	categoryId: '123e4567-e89b-12d3-a456-426614174001',
	destinationAmount: null,
	exchangeRate: null
};

it('createMovement sets the owner from userId', () => {
	const q = createMovement('user-a', row).toSQL();
	expect(q.sql).toContain('"user_id"');
	expect(q.params).toContain('user-a');
	expect(q.params).not.toContain('user-b');
});

const id = '123e4567-e89b-12d3-a456-426614174009';
const none = parseMovementFilters(new URLSearchParams()).query;
const builders = (u: string) => [
	listMovements(u, none, 1),
	getMovement(u, id),
	updateMovement(u, id, row),
	deleteMovement(u, id)
];

it('every query is owner-scoped with only the requesting user id', () => {
	for (const q of builders('user-a')) {
		const { sql, params } = q.toSQL();
		expect(sql).toContain('"owner_id"');
		expect(sql).toContain('"user_id"');
		expect(params).toContain('user-a');
		expect(params).not.toContain('user-b');
	}
});

it('listMovements checks the destination alias owner, orders and paginates', () => {
	const { sql, params } = listMovements('user-a', none, 3).toSQL();
	expect(sql).toContain('"dest"."owner_id"');
	expect(sql).toMatch(
		/order by "movements"."occurred_at" desc, "movements"."created_at" desc, "movements"."id" desc/
	);
	expect(sql).toContain('limit $');
	expect(sql).toContain('offset $');
	expect(params.slice(-2)).toEqual([51, 100]);
});

it('listMovements adds filter conditions only when set', () => {
	const base = listMovements('u', none, 1).toSQL();
	expect(base.sql).not.toContain('ilike');
	expect(base.sql).not.toContain('"occurred_at" >=');
	expect(base.sql).not.toContain('"occurred_at" <');
	expect(base.sql).not.toContain('"movements"."type" =');
	const sp = new URLSearchParams({
		q: '50%_',
		from: '2026-10-01',
		to: '2026-10-31',
		type: 'transfer',
		account: id,
		category: id,
		currency: 'USD'
	});
	const { query } = parseMovementFilters(sp);
	const { sql, params } = listMovements('u', query, 1).toSQL();
	expect(sql).toContain('ilike');
	expect(params).toContain('%50\\%\\_%');
	expect(sql).toContain('"movements"."occurred_at" >=');
	expect(sql).toContain('"movements"."occurred_at" <');
	expect(params).toContain('2026-10-01T03:00:00.000Z');
	expect(params).toContain('2026-11-01T03:00:00.000Z');
	expect(sql).toContain('"movements"."type" =');
	expect(sql).toContain('"movements"."category_id" =');
	expect(sql).toContain('"dest"."id" =');
	expect(sql).toContain('"financial_accounts"."currency" =');
	expect(sql).toContain('"dest"."currency" =');
	expect(params).toContain('USD');
});
