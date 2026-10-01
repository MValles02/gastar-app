import { expect, it } from 'vitest';
import { parseCategoryForm, toCurrencyNets } from './categories';

const form = (o: Record<string, string>) => {
	const fd = new FormData();
	for (const [k, v] of Object.entries(o)) fd.set(k, v);
	return fd;
};

it('trims the name and accepts a valid color', () => {
	expect(parseCategoryForm(form({ name: '  Comida ', color: 'green' }))).toEqual({
		ok: true,
		data: { name: 'Comida', color: 'green' }
	});
});

it('rejects empty names and names over 40 characters', () => {
	const empty = parseCategoryForm(form({ name: '   ', color: 'green' }));
	expect(empty.ok === false && empty.errors.name).toBe('Ingresá un nombre.');
	expect(parseCategoryForm(form({ name: 'a'.repeat(40), color: 'green' })).ok).toBe(true);
	const long = parseCategoryForm(form({ name: 'a'.repeat(41), color: 'green' }));
	expect(long.ok === false && long.errors.name).toBe('El nombre puede tener hasta 40 caracteres.');
});

it('rejects unknown colors and returns raw values', () => {
	const r = parseCategoryForm(form({ name: ' x ', color: 'nope' }));
	expect(r).toEqual({
		ok: false,
		values: { name: ' x ', color: 'nope' },
		errors: { color: 'Elegí un color.' }
	});
	const missing = parseCategoryForm(new FormData());
	expect(missing.ok).toBe(false);
});

it('toCurrencyNets puts ARS first and allows negative nets', () => {
	expect(
		toCurrencyNets([
			{ currency: 'USD', outcome: 100, income: 30 },
			{ currency: 'ARS', outcome: 10, income: 50 }
		])
	).toEqual([
		{ currency: 'ARS', net: -40 },
		{ currency: 'USD', net: 70 }
	]);
	expect(toCurrencyNets([])).toEqual([]);
});
