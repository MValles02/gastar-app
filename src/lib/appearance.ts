export const ACCOUNT_ICONS = [
	{ key: 'bank', label: 'Banco' },
	{ key: 'wallet', label: 'Billetera' },
	{ key: 'cash', label: 'Efectivo' },
	{ key: 'card', label: 'Tarjeta' },
	{ key: 'piggy-bank', label: 'Alcancía' },
	{ key: 'dollar', label: 'Dólar' },
	{ key: 'coins', label: 'Monedas' },
	{ key: 'safe', label: 'Caja fuerte' },
	{ key: 'briefcase', label: 'Maletín' },
	{ key: 'phone', label: 'Celular' }
] as const;

// Generic names on purpose: Categories reuses these swatches.
export const SWATCHES = [
	{ key: 'green', label: 'Verde' },
	{ key: 'teal', label: 'Turquesa' },
	{ key: 'blue', label: 'Azul' },
	{ key: 'violet', label: 'Violeta' },
	{ key: 'plum', label: 'Ciruela' },
	{ key: 'red', label: 'Rojo' },
	{ key: 'orange', label: 'Naranja' },
	{ key: 'ochre', label: 'Ocre' }
] as const;

export type AccountIconKey = (typeof ACCOUNT_ICONS)[number]['key'];
export type SwatchKey = (typeof SWATCHES)[number]['key'];

export const toIconKey = (s: string | null): AccountIconKey =>
	ACCOUNT_ICONS.some((i) => i.key === s) ? (s as AccountIconKey) : 'wallet';
export const toSwatchKey = (s: string | null): SwatchKey | null =>
	SWATCHES.some((w) => w.key === s) ? (s as SwatchKey) : null;
