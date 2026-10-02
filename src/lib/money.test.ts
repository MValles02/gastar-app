import { expect, it } from 'vitest';
import { formatMoney } from './money';

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
