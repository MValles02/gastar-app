import { expect, it } from 'vitest';
import {
	parseMovementFilters,
	parseMovementForm,
	resolveMovement,
	type MovementData
} from './movements';

const A = '123e4567-e89b-12d3-a456-426614174000';
const B = '123e4567-e89b-12d3-a456-426614174001';
const C = '123e4567-e89b-12d3-a456-426614174002';

const form = (o: Record<string, string>) => {
	const fd = new FormData();
	for (const [k, v] of Object.entries(o)) fd.set(k, v);
	return fd;
};
const valid = {
	type: 'outcome',
	occurredAt: '2026-10-01T09:30',
	description: ' Café ',
	amount: '1.234,56',
	accountId: A,
	categoryId: C
};
const errorsOf = (o: Record<string, string>) => {
	const r = parseMovementForm(form({ ...valid, ...o }));
	return r.ok ? {} : r.errors;
};

it('parses a valid outcome and a transfer', () => {
	const r = parseMovementForm(form(valid));
	expect(r).toMatchObject({
		ok: true,
		data: { description: 'Café', amount: 123456, destinationAccountId: null, exchangeRate: null }
	});
	const t = parseMovementForm(
		form({
			...valid,
			type: 'transfer',
			destinationAccountId: B,
			categoryId: '',
			exchangeRate: '1.500'
		})
	);
	expect(t).toMatchObject({
		ok: true,
		data: { categoryId: null, destinationAccountId: B, exchangeRate: 150000 }
	});
});

it('reports each syntax error with its message', () => {
	expect(errorsOf({ type: 'x' }).type).toBe('Elegí un tipo de movimiento.');
	for (const occurredAt of ['', '2026-02-30T10:00', '1999-12-31T10:00'])
		expect(errorsOf({ occurredAt }).occurredAt).toBe('Ingresá una fecha y hora válidas.');
	expect(errorsOf({ description: '  ' }).description).toBe('Ingresá una descripción.');
	expect(errorsOf({ description: 'a'.repeat(61) }).description).toBe(
		'La descripción puede tener hasta 60 caracteres.'
	);
	for (const amount of ['', '0', '-1', 'abc'])
		expect(errorsOf({ amount }).amount).toBe(
			'Ingresá un monto mayor a cero, con hasta 2 decimales (ej.: 1.234,56).'
		);
	expect(errorsOf({ accountId: 'nope' }).accountId).toBe('Elegí una cuenta.');
	expect(errorsOf({ categoryId: '' }).categoryId).toBe('Elegí una categoría.');
	const tr = { type: 'transfer', categoryId: '' };
	expect(errorsOf(tr).destinationAccountId).toBe('Elegí la cuenta de destino.');
	// the rate is validated by resolveMovement, only for cross-currency transfers
	expect(errorsOf({ ...tr, destinationAccountId: B, exchangeRate: 'abc' }).exchangeRate).toBe(
		undefined
	);
});

it('returns raw values on failure and allows future dates', () => {
	const r = parseMovementForm(form({ ...valid, amount: 'abc' }));
	expect(r.ok).toBe(false);
	if (!r.ok) expect(r.values).toMatchObject({ amount: 'abc', description: ' Café ' });
	expect(parseMovementForm(form({ ...valid, occurredAt: '2099-01-01T00:00' })).ok).toBe(true);
});

const ars = { id: A, currency: 'ARS' as const, archivedAt: null };
const usd = { id: B, currency: 'USD' as const, archivedAt: null };
const cat = { id: C, archivedAt: null };
const data = (o: Partial<MovementData> = {}): MovementData => ({
	type: 'outcome',
	occurredAt: new Date('2026-10-01T12:30:00Z'),
	description: 'x',
	amount: 10000,
	accountId: A,
	destinationAccountId: null,
	categoryId: C,
	exchangeRate: null,
	...o
});
const transfer = (o: Partial<MovementData> = {}) =>
	data({ type: 'transfer', categoryId: null, destinationAccountId: B, ...o });
const parsedTransfer = (exchangeRate: string) => {
	const r = parseMovementForm(
		form({ ...valid, type: 'transfer', destinationAccountId: B, categoryId: '', exchangeRate })
	);
	if (!r.ok) throw new Error('expected a valid parse');
	return r.data;
};
const errs = (r: ReturnType<typeof resolveMovement>) => (r.ok ? {} : r.errors);
const archived = new Date();

it('resolves income/outcome ignoring destination and rate', () => {
	const r = resolveMovement(data({ type: 'income', destinationAccountId: B, exchangeRate: 5 }), {
		origin: ars,
		destination: usd,
		category: cat
	});
	expect(r).toMatchObject({
		ok: true,
		row: { categoryId: C, destinationAccountId: null, destinationAmount: null, exchangeRate: null }
	});
});

it('rejects missing and archived rows', () => {
	expect(errs(resolveMovement(data(), { origin: undefined, category: cat })).accountId).toBe(
		'Elegí una cuenta.'
	);
	expect(
		errs(resolveMovement(data(), { origin: { ...ars, archivedAt: archived }, category: cat }))
			.accountId
	).toBe('Esa cuenta está archivada. Elegí otra.');
	expect(errs(resolveMovement(data(), { origin: ars, category: undefined })).categoryId).toBe(
		'Elegí una categoría.'
	);
	expect(
		errs(resolveMovement(data(), { origin: ars, category: { ...cat, archivedAt: archived } }))
			.categoryId
	).toBe('Esa categoría está archivada. Elegí otra.');
	expect(errs(resolveMovement(transfer(), { origin: ars })).destinationAccountId).toBe(
		'Elegí la cuenta de destino.'
	);
	expect(
		errs(
			resolveMovement(transfer(), { origin: ars, destination: { ...usd, archivedAt: archived } })
		).destinationAccountId
	).toBe('Esa cuenta está archivada. Elegí otra.');
	expect(
		errs(resolveMovement(transfer(), { origin: ars, destination: ars })).destinationAccountId
	).toBe('Elegí una cuenta distinta de la de origen.');
});

it('resolves transfers by currency', () => {
	const same = resolveMovement(transfer({ exchangeRate: 150000 }), {
		origin: ars,
		destination: { ...ars, id: B }
	});
	expect(same).toMatchObject({
		ok: true,
		row: { categoryId: null, exchangeRate: null, destinationAmount: 10000 }
	});
	const rateMsg = 'Ingresá la cotización (1 USD = X ARS), mayor a cero y con hasta 2 decimales.';
	expect(errs(resolveMovement(transfer(), { origin: ars, destination: usd })).exchangeRate).toBe(
		rateMsg
	);
	for (const exchangeRate of ['0', 'abc', ''])
		expect(
			errs(resolveMovement(parsedTransfer(exchangeRate), { origin: ars, destination: usd }))
				.exchangeRate
		).toBe(rateMsg);
	expect(
		resolveMovement(parsedTransfer('abc'), { origin: ars, destination: { ...ars, id: B } })
	).toMatchObject({ ok: true, row: { exchangeRate: null, destinationAmount: 123456 } });
	expect(
		resolveMovement(transfer({ exchangeRate: 150000 }), { origin: usd, destination: ars })
	).toMatchObject({
		ok: true,
		row: { destinationAmount: 15000000, exchangeRate: 150000 }
	});
	expect(
		errs(
			resolveMovement(transfer({ amount: 1, exchangeRate: 201 }), { origin: ars, destination: usd })
		).amount
	).toBe('El monto convertido da 0. Revisá el monto o la cotización.');
	expect(
		errs(
			resolveMovement(transfer({ amount: Number.MAX_SAFE_INTEGER, exchangeRate: 100000 }), {
				origin: usd,
				destination: ars
			})
		).amount
	).toBe('El monto convertido es demasiado grande.');
});

it('resolveMovement accepts archived rows only when kept', () => {
	const old = new Date('2026-01-01T00:00:00Z');
	const acc = (id: string) => ({ id, currency: 'ARS' as const, archivedAt: old });
	const cat = { id: C, archivedAt: old };
	const keep = { accountIds: [A, B], categoryId: C };
	expect(resolveMovement(data(), { origin: acc(A), category: cat }, keep).ok).toBe(true);
	expect(resolveMovement(data(), { origin: acc(A), category: cat }).ok).toBe(false);
	expect(
		resolveMovement(data(), { origin: acc(A), category: cat }, { ...keep, categoryId: null }).ok
	).toBe(false);
	const t = data({ type: 'transfer', destinationAccountId: B, categoryId: null });
	const live = { id: A, currency: 'ARS' as const, archivedAt: null };
	expect(resolveMovement(t, { origin: live, destination: acc(B) }, keep).ok).toBe(true);
	expect(resolveMovement(t, { origin: live, destination: acc(B) }).ok).toBe(false);
	expect(
		resolveMovement(t, { origin: live, destination: acc(B) }, { ...keep, accountIds: [A] }).ok
	).toBe(false);
});

it('parseMovementFilters normalises input', () => {
	const f = (o: Record<string, string>) => parseMovementFilters(new URLSearchParams(o));
	const empty = f({});
	expect(empty).toMatchObject({ page: 1, activeCount: 0 });
	expect(empty.values.q).toBe('');
	const bad = f({
		q: 'x'.repeat(61),
		from: '2026-02-30',
		to: 'nope',
		type: 'x',
		account: 'z',
		category: 'z',
		currency: 'EUR',
		page: '0'
	});
	expect(bad.activeCount).toBe(0);
	expect(bad.page).toBe(1);
	expect(f({ page: '2.5' }).page).toBe(1);
	expect(f({ page: '3' }).page).toBe(3);
	expect(f({ page: '2' }).page).toBe(2);
	expect(f({ page: 'abc' }).page).toBe(1);
	for (const p of ['1e18', '1e300', '99999999999', '10001']) expect(f({ page: p }).page).toBe(1);
	expect(f({ page: '10000' }).page).toBe(10000);
	expect(f({ to: '9999-12-31' }).query.to).toBe('');
	expect(f({ from: '9999-01-01' }).query.from).toBe('');
	const swapped = f({ from: '2026-10-31', to: '2026-10-01', q: ' café ', type: 'income' });
	expect(swapped.query).toMatchObject({ from: '2026-10-01', to: '2026-10-31', q: 'café' });
	expect(swapped.values.type).toBe('income');
	expect(swapped.activeCount).toBe(4);
	expect(f({ account: A, category: C, currency: 'USD', page: '4' }).activeCount).toBe(3);
});
