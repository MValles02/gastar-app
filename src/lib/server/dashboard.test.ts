import { expect, it } from 'vitest';
import { monthNet, toRecentItem, topCategories, totalBalance, type RecentRow } from './dashboard';

it('balance: initial (archived included by the query) and transfer out subtract', () => {
	expect(totalBalance(1000, [{ type: 'transfer', amount: 300 }], 0)).toBe(700);
	expect(
		totalBalance(
			1000,
			[
				{ type: 'income', amount: 500 },
				{ type: 'outcome', amount: 200 }
			],
			0
		)
	).toBe(1300);
});

it('balance: cross-currency transfer adds destination_amount, not amount', () => {
	// USD 100 into ARS 150000: USD side loses 100, ARS side gains 150000
	expect(totalBalance(0, [], 150000_00)).toBe(150000_00);
	expect(totalBalance(500_00, [{ type: 'transfer', amount: 100_00 }], 0)).toBe(400_00);
});

it('balance: same-currency transfer nets to 0', () => {
	const from = totalBalance(0, [{ type: 'transfer', amount: 100 }], 0);
	const to = totalBalance(0, [], 100);
	expect(from + to).toBe(0);
});

it('monthNet ignores transfers', () => {
	expect(
		monthNet([
			{ type: 'income', amount: 1000 },
			{ type: 'outcome', amount: 400 },
			{ type: 'transfer', amount: 9999 }
		])
	).toBe(600);
	expect(monthNet([])).toBe(0);
});

const cat = (id: string, name: string, outcome: number, income = 0) => ({
	id,
	name,
	outcome,
	income
});

it('topCategories nets income against outcome and drops net <= 0', () => {
	const r = topCategories([cat('a', 'A', 100, 50), cat('b', 'B', 10, 10), cat('c', 'C', 5, 50)]);
	expect(r).toEqual([{ id: 'a', name: 'A', net: 50, share: 1 }]);
	expect(topCategories([cat('b', 'B', 10, 10)])).toEqual([]);
	expect(topCategories([])).toEqual([]);
});

it('topCategories share uses all positive nets and keeps 3', () => {
	const r = topCategories([
		cat('1', 'A', 40),
		cat('2', 'B', 30),
		cat('3', 'C', 20),
		cat('4', 'D', 10)
	]);
	expect(r.map((x) => x.id)).toEqual(['1', '2', '3']);
	expect(r.reduce((a, x) => a + x.share, 0)).toBeLessThan(1);
	expect(r[0].share).toBeCloseTo(0.4);
});

it('topCategories orders equal nets by name', () => {
	const r = topCategories([cat('z', 'Zeta', 10), cat('a', 'Alfa', 10)]);
	expect(r.map((x) => x.name)).toEqual(['Alfa', 'Zeta']);
});

const row = (over: Partial<RecentRow>): RecentRow => ({
	id: '1',
	type: 'outcome',
	description: 'x',
	occurredAt: new Date(0),
	amount: 100,
	destinationAmount: null,
	accountName: 'Cuenta',
	accountCurrency: 'ARS',
	destinationAccountName: null,
	categoryName: 'Cat',
	...over
});

it('toRecentItem signs', () => {
	expect(toRecentItem(row({ type: 'income' }), 'ARS')).toMatchObject({
		amount: 100,
		sign: 'positive'
	});
	expect(toRecentItem(row({ type: 'outcome' }), 'ARS')).toMatchObject({
		amount: -100,
		sign: 'negative'
	});
	expect(toRecentItem(row({ type: 'transfer' }), 'ARS')).toMatchObject({
		amount: 100,
		sign: 'neutral'
	});
});

it('toRecentItem in both mode keeps the origin amount and carries its own currency', () => {
	const t = row({
		type: 'transfer',
		accountCurrency: 'USD',
		amount: 100_00,
		destinationAmount: 150000_00
	});
	expect(toRecentItem(t, t.accountCurrency)).toMatchObject({ amount: 100_00, currency: 'USD' });
	const o = row({ type: 'outcome', accountCurrency: 'ARS' });
	expect(toRecentItem(o, o.accountCurrency)).toMatchObject({ amount: -100, currency: 'ARS' });
});

it('toRecentItem shows destinationAmount from the destination currency', () => {
	const t = row({
		type: 'transfer',
		accountCurrency: 'USD',
		amount: 100_00,
		destinationAmount: 150000_00,
		destinationAccountName: 'Pesos'
	});
	expect(toRecentItem(t, 'USD').amount).toBe(100_00);
	expect(toRecentItem(t, 'ARS').amount).toBe(150000_00);
});
