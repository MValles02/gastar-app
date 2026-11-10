/** UI locale for every number and date shown to the user (docs/scope.md). */
export const LOCALE = 'es-AR';

const PERCENT = new Intl.NumberFormat(LOCALE, { style: 'percent' });

/** 0.125 -> "13 %" style percent text (whole percent, es-AR). */
export const formatPercent = (ratio: number) => PERCENT.format(ratio);

/** Percent x 100 as plain es-AR text, no "%" and no grouping: 1250 -> "12,5", 1000 -> "10". */
export const formatPercentInput = (p: number) =>
	(p / 100).toLocaleString(LOCALE, { maximumFractionDigits: 2, useGrouping: false });

/** Long name of the current month in Buenos Aires, e.g. "marzo". */
export const currentMonthName = () =>
	new Date().toLocaleString(LOCALE, {
		month: 'long',
		timeZone: 'America/Argentina/Buenos_Aires'
	});

/** "2024-02-29" -> "29/02/2024" (dd/mm/aaaa). */
export const formatDay = (ymd: string) =>
	`${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;
