/** UI locale for every number and date shown to the user (docs/SCOPE.md). */
export const LOCALE = 'es-AR';

/** "2024-02-29" -> "29/02/2024" (dd/mm/aaaa). */
export const formatDay = (ymd: string) =>
	`${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;
