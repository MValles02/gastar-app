import { expect, it } from 'vitest';
import {
	currentMonth,
	dateLabel,
	dateTimeLabel,
	dayHeading,
	dayStart,
	localDay,
	monthLabel,
	monthRange,
	parseLocalDateTime,
	parseMonth,
	shiftMonth,
	toLocalInput
} from './month';

it('currentMonth follows Buenos Aires time', () => {
	expect(currentMonth(new Date('2026-09-30T23:59:59-03:00'))).toBe('2026-09');
	expect(currentMonth(new Date('2026-10-01T00:00:00-03:00'))).toBe('2026-10');
	expect(currentMonth(new Date('2026-10-01T02:30:00Z'))).toBe('2026-09');
});

it('parseMonth falls back to the current month', () => {
	const now = new Date('2026-10-15T12:00:00Z');
	expect(parseMonth('2026-08', now)).toBe('2026-08');
	expect(parseMonth('2026-10', now)).toBe('2026-10');
	expect(parseMonth('2026-11', now)).toBe('2026-11');
	expect(parseMonth('2099-01', now)).toBe('2099-01');
	for (const bad of ['2026-13', 'abc', null]) {
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
	expect(monthLabel('2026-10', false)).toBe('Octubre');
	expect(dateLabel(new Date('2026-10-01T02:30:00Z'))).toMatch(/^30 sep/);
});

it('parseLocalDateTime reads BA wall time', () => {
	expect(parseLocalDateTime('2026-10-01T09:30')?.toISOString()).toBe('2026-10-01T12:30:00.000Z');
	expect(parseLocalDateTime('2099-01-01T00:00')).not.toBeNull();
	for (const bad of ['2026-02-30T10:00', '2026-10-01 09:30', '2026-10-01T24:00', '']) {
		expect(parseLocalDateTime(bad)).toBeNull();
	}
});

it('toLocalInput formats in BA time', () => {
	expect(toLocalInput(new Date('2026-10-01T02:59:00Z'))).toBe('2026-09-30T23:59');
	expect(toLocalInput(new Date('2026-10-01T03:00:00Z'))).toBe('2026-10-01T00:00');
});

it('dayStart, localDay and dayHeading use Buenos Aires days', () => {
	expect(dayStart('2026-10-01')?.toISOString()).toBe('2026-10-01T03:00:00.000Z');
	expect(dayStart('2026-02-30')).toBeNull();
	expect(localDay(new Date('2026-10-01T02:59:00Z'))).toBe('2026-09-30');
	expect(localDay(new Date('2026-10-02T00:30:00Z'))).toBe('2026-10-01');
	expect(dayHeading('2026-10-02', '2026-10-02')).toBe('Hoy');
	expect(dayHeading('2026-10-01', '2026-10-02')).toBe('Ayer');
	expect(dayHeading('2026-09-30', '2026-10-02')).toBe('Miércoles 30 de septiembre');
	expect(dayHeading('2025-09-30', '2026-10-02')).toMatch(/^Martes 30 de septiembre de 2025$/);
});

it('dateTimeLabel returns a non-empty es-AR string', () => {
	expect(dateTimeLabel(new Date('2026-10-01T12:00:00Z'))).toMatch(/octubre/);
});
