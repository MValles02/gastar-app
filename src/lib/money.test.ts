import { expect, it } from 'vitest';
import { formatAmountInput, formatMoney, parseAmount } from './money';

const NB = ' ';

it('formats ARS and USD', () => {
	expect(formatMoney(123456789, 'ARS')).toBe(`$${NB}1.234.567,89`);
	expect(formatMoney(123456, 'USD')).toBe(`US$${NB}1.234,56`);
	expect(formatMoney(0, 'ARS')).toBe(`$${NB}0,00`);
	expect(formatMoney(99999999999, 'ARS')).toBe(`$${NB}999.999.999,99`);
});

it('handles signs', () => {
	expect(formatMoney(-123456, 'ARS')).toBe(`-$${NB}1.234,56`);
	expect(formatMoney(-5, 'USD')).toBe(`-US$${NB}0,05`);
	expect(formatMoney(100, 'ARS', { sign: 'always' })).toBe(`+$${NB}1,00`);
	expect(formatMoney(100, 'ARS')).toBe(`$${NB}1,00`);
	expect(formatMoney(0, 'ARS', { sign: 'always' })).toBe(`$${NB}0,00`);
});

it('parseAmount accepts valid input', () => {
	expect(parseAmount('0')).toBe(0);
	expect(parseAmount('1234')).toBe(123400);
	expect(parseAmount(' 1.234,56 ')).toBe(123456);
	expect(parseAmount('-1.234,5')).toBe(-123450);
	expect(parseAmount('0,05')).toBe(5);
	expect(parseAmount('-0')).toBe(0);
	expect(Object.is(parseAmount('-0'), 0)).toBe(true);
	expect(parseAmount('9999999999999')).toBe(999999999999900);
});

it('parseAmount rejects invalid input', () => {
	for (const s of [
		'',
		'1,234',
		'1.5',
		'12.34.5',
		',5',
		'5,',
		'1,2,3',
		'abc',
		'--1',
		'10000000000000'
	])
		expect(parseAmount(s), s).toBeNull();
});

it('formatAmountInput round-trips with parseAmount', () => {
	expect(formatAmountInput(-123456)).toBe('-1234,56');
	for (const c of [0, 5, 100, -5, 123456, -123450, 999999999999900])
		expect(parseAmount(formatAmountInput(c))).toBe(c);
});
