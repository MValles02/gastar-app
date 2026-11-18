/** UI locale for every number and date shown to the user (docs/scope.md). */
export const LOCALE = 'es-AR';

/** The app's one time zone: days, months and "today" are Buenos Aires time. */
export const APP_TZ = 'America/Argentina/Buenos_Aires';

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
		timeZone: APP_TZ
	});

export const formatDay = (ymd: string) =>
	`${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;
