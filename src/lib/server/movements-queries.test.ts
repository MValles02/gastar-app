import { expect, it } from 'vitest';
import { createMovement } from './movements-queries';

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
