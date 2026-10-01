import { expect, it } from 'vitest';
import { currentMonth, dateLabel, monthLabel, monthRange, parseMonth, shiftMonth } from './month';

it('currentMonth follows Buenos Aires time', () => {
	expect(currentMonth(new Date('2026-09-30T23:59:59-03:00'))).toBe('2026-09');
	expect(currentMonth(new Date('2026-10-01T00:00:00-03:00'))).toBe('2026-10');
	expect(currentMonth(new Date('2026-10-01T02:30:00Z'))).toBe('2026-09');
});

it('parseMonth falls back to the current month', () => {
	const now = new Date('2026-10-15T12:00:00Z');
	expect(parseMonth('2026-08', now)).toBe('2026-08');
	expect(parseMonth('2026-10', now)).toBe('2026-10');
	for (const bad of ['2026-13', 'abc', null, '2026-11']) {
		expect(parseMonth(bad, now)).toBe('2026-10');
	}
});

it('monthRange is [1st 00:00, next 1st 00:00) in BA time', () => {
	const r = monthRange('2026-10');
	expect(r.start.toISOString()).toBe('2026-10-01T03:00:00.000Z');
	expect(r.end.toISOString()).toBe('2026-11-01T03:00:00.000Z');
	expect(monthRange('2026-12').end.toISOString()).toBe('2027-01-01T03:00:00.000Z');
});

it('shiftMonth crosses years', () => {
	expect(shiftMonth('2026-12', 1)).toBe('2027-01');
	expect(shiftMonth('2026-01', -1)).toBe('2025-12');
});

it('labels in es-AR', () => {
	expect(monthLabel('2026-10')).toBe('Octubre de 2026');
	expect(dateLabel(new Date('2026-10-01T02:30:00Z'))).toMatch(/^30 sep/);
});
