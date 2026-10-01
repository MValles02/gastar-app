import { expect, it } from 'vitest';
import {
	accountOriginSums,
	accountReferenced,
	accountTransfersIn,
	createAccount,
	deleteAccount,
	getAccount,
	listAccounts,
	setArchived,
	updateAccount
} from './accounts-queries';

const id = '123e4567-e89b-12d3-a456-426614174000';
const data = { name: 'x', initialBalance: 0, icon: 'bank', color: 'green' };

const builders = (u: string) => [
	listAccounts(u, {}),
	listAccounts(u, { q: 'a', currency: 'USD', archived: true }),
	getAccount(u, id),
	accountOriginSums(u),
	accountOriginSums(u, id),
	accountTransfersIn(u),
	accountTransfersIn(u, id),
	accountReferenced(u, id),
	createAccount(u, { ...data, currency: 'ARS' }),
	updateAccount(u, id, data),
	updateAccount(u, id, { ...data, currency: 'USD' }),
	deleteAccount(u, id),
	setArchived(u, id, null)
];

it('every query is scoped by owner_id with the userId as a param', () => {
	for (const q of builders('user-a')) {
		const { sql, params } = q.toSQL();
		expect(sql).toContain('owner_id');
		expect(params).toContain('user-a');
	}
	for (const q of builders('user-b')) {
		expect(q.toSQL().params).toContain('user-b');
		expect(q.toSQL().params).not.toContain('user-a');
	}
});

it('by-id builders combine id with the owner check in WHERE', () => {
	for (const q of [
		getAccount('u', id),
		updateAccount('u', id, data),
		deleteAccount('u', id),
		setArchived('u', id, new Date())
	]) {
		const { sql, params } = q.toSQL();
		expect(sql).toMatch(/where .*"id" = \$.*"owner_id" = \$/is);
		expect(params).toContain(id);
	}
});

it('createAccount params include the userId', () => {
	expect(createAccount('user-a', { ...data, currency: 'ARS' }).toSQL().params).toContain('user-a');
});

it('listAccounts excludes archived by default and filters by escaped name', () => {
	expect(listAccounts('u', {}).toSQL().sql).toContain('archived_at" is null');
	expect(listAccounts('u', { archived: true }).toSQL().sql).not.toContain('archived_at" is null');
	const { sql, params } = listAccounts('u', { q: '50%' }).toSQL();
	expect(sql).toContain('ilike');
	expect(params).toContain('%50\\%%');
	expect(sql).toMatch(/order by "financial_accounts"."name" asc/i);
});

it('accountTransfersIn requires both origin and dest accounts to be owned', () => {
	const { sql, params } = accountTransfersIn('u').toSQL();
	expect(sql).toContain('"financial_accounts"."owner_id"');
	expect(sql).toContain('"dest"."owner_id"');
	expect(params.filter((p) => p === 'u')).toHaveLength(2);
});

it('accountReferenced checks both movement account columns', () => {
	const { sql } = accountReferenced('u', id).toSQL();
	expect(sql).toContain('account_id');
	expect(sql).toContain('destination_account_id');
	expect(sql).toMatch(/limit/i);
});

it('a currency-changing update carries the NOT EXISTS movement lock', () => {
	const { sql } = updateAccount('u', id, { ...data, currency: 'USD' }).toSQL();
	expect(sql).toMatch(/not exists/i);
	expect(sql).toContain('"account_id"');
	expect(sql).toContain('"destination_account_id"');
	expect(updateAccount('u', id, data).toSQL().sql).not.toMatch(/not exists/i);
});
