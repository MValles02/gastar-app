import { expect, it } from 'vitest';
import {
	accountActions,
	currencyChangeAllowed,
	escapeLike,
	isUuid,
	parseAccountForm,
	withBalances
} from './accounts';
import { totalBalance } from './dashboard';

const form = (o: Record<string, string>) => {
	const fd = new FormData();
	for (const [k, v] of Object.entries(o)) fd.set(k, v);
	return fd;
};
const valid = {
	name: ' Galicia ',
	currency: 'ARS',
	initialBalance: '1.000,50',
	icon: 'bank',
	color: 'green'
};
const errorsOf = (o: Record<string, string>, mode: 'create' | 'edit' = 'create') => {
	const r = parseAccountForm(form({ ...valid, ...o }), mode);
	return r.ok ? {} : r.errors;
};

it('parses a valid form into typed data', () => {
	expect(parseAccountForm(form(valid), 'create')).toEqual({
		ok: true,
		data: { name: 'Galicia', currency: 'ARS', initialBalance: 100050, icon: 'bank', color: 'green' }
	});
	const r = parseAccountForm(form({ ...valid, initialBalance: '' }), 'create');
	expect(r.ok && r.data.initialBalance).toBe(0);
});

it('validates the name', () => {
	expect(errorsOf({ name: '   ' }).name).toBe('Ingresá un nombre.');
	expect(errorsOf({ name: 'x'.repeat(41) }).name).toBe(
		'El nombre puede tener hasta 40 caracteres.'
	);
	expect(errorsOf({ name: 'x'.repeat(40) }).name).toBeUndefined();
});

it('validates the currency; missing means keep on edit', () => {
	expect(errorsOf({ currency: 'EUR' }).currency).toBe('Elegí una moneda.');
	expect(errorsOf({ currency: '' }).currency).toBe('Elegí una moneda.');
	expect(errorsOf({ currency: 'EUR' }, 'edit').currency).toBe('Elegí una moneda.');
	const fd = form(valid);
	fd.delete('currency');
	const r = parseAccountForm(fd, 'edit');
	expect(r.ok && r.data.currency).toBeUndefined();
});

it('validates initial balance, icon and color', () => {
	expect(errorsOf({ initialBalance: '1,234' }).initialBalance).toBe(
		'Ingresá un monto válido, con hasta 2 decimales (ej.: 1.234,56).'
	);
	expect(errorsOf({ icon: 'nope' }).icon).toBe('Elegí un ícono.');
	expect(errorsOf({ color: '' }).color).toBe('Elegí un color.');
});

it('failure returns the raw values', () => {
	const r = parseAccountForm(form({ ...valid, name: '' }), 'create');
	expect(!r.ok && r.values.initialBalance).toBe('1.000,50');
});

it('currencyChangeAllowed', () => {
	expect(currencyChangeAllowed('ARS', 'ARS', true)).toBe(true);
	expect(currencyChangeAllowed('ARS', 'USD', true)).toBe(false);
	expect(currencyChangeAllowed('ARS', 'USD', false)).toBe(true);
});

it('accountActions covers referenced x archived', () => {
	expect(accountActions({ referenced: false, archived: false })).toEqual({
		canDelete: true,
		canArchive: false,
		canUnarchive: false
	});
	expect(accountActions({ referenced: false, archived: true })).toEqual({
		canDelete: true,
		canArchive: false,
		canUnarchive: true
	});
	expect(accountActions({ referenced: true, archived: false })).toEqual({
		canDelete: false,
		canArchive: true,
		canUnarchive: false
	});
	expect(accountActions({ referenced: true, archived: true })).toEqual({
		canDelete: false,
		canArchive: false,
		canUnarchive: true
	});
});

it('isUuid', () => {
	expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
	expect(isUuid('nope')).toBe(false);
	expect(isUuid('')).toBe(false);
});

it('escapeLike', () => {
	expect(escapeLike('50%_x')).toBe('50\\%\\_x');
	expect(escapeLike('a\\b')).toBe('a\\\\b');
});

it('withBalances uses the dashboard formula per account', () => {
	const accounts = [
		{ id: 'a', initialBalance: 1000 },
		{ id: 'b', initialBalance: 0 }
	];
	const sums = [
		{ accountId: 'a', type: 'income' as const, amount: 500 },
		{ accountId: 'a', type: 'outcome' as const, amount: 200 },
		{ accountId: 'a', type: 'transfer' as const, amount: 300 },
		{ accountId: 'b', type: 'income' as const, amount: 50 }
	];
	const res = withBalances(accounts, sums, [{ accountId: 'a', amount: 70 }]);
	expect(res[0].balance).toBe(totalBalance(1000, sums.slice(0, 3), 70));
	expect(res[0].balance).toBe(1070);
	expect(res[1].balance).toBe(50);
});
