import { describe, expect, it } from 'vitest';
import { parseCurrencyPref, safeRedirectTo } from './currency-pref';

describe('parseCurrencyPref', () => {
	it('accepts valid values', () => {
		expect(parseCurrencyPref('ARS')).toBe('ARS');
		expect(parseCurrencyPref('USD')).toBe('USD');
		expect(parseCurrencyPref('both')).toBe('both');
	});

	it('falls back to both', () => {
		expect(parseCurrencyPref(undefined)).toBe('both');
		expect(parseCurrencyPref(null)).toBe('both');
		expect(parseCurrencyPref('')).toBe('both');
		expect(parseCurrencyPref('EUR')).toBe('both');
		expect(parseCurrencyPref('ars')).toBe('both');
	});
});

describe('safeRedirectTo', () => {
	it('keeps local paths with query', () => {
		expect(safeRedirectTo('/movements?page=2')).toBe('/movements?page=2');
		expect(safeRedirectTo('/')).toBe('/');
		expect(safeRedirectTo('/movements?account=1')).toBe('/movements?account=1');
	});

	it('rejects open redirects and non-strings', () => {
		expect(safeRedirectTo('//evil')).toBe('/');
		expect(safeRedirectTo('/\\evil')).toBe('/');
		expect(safeRedirectTo('https://evil.com')).toBe('/');
		expect(safeRedirectTo('evil')).toBe('/');
		expect(safeRedirectTo(null)).toBe('/');
		expect(safeRedirectTo('/\t/evil.com')).toBe('/');
		expect(safeRedirectTo('/\n/evil.com')).toBe('/');
		expect(safeRedirectTo('/\r/evil.com')).toBe('/');
	});
});
