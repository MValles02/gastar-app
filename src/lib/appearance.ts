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

// Category glyphs: everyday spending and income. 'home' shares its glyph with the nav icon.
export const CATEGORY_ICONS = [
	{ key: 'cart', label: 'Supermercado' },
	{ key: 'food', label: 'Comida' },
	{ key: 'transport', label: 'Transporte' },
	{ key: 'car', label: 'Auto' },
	{ key: 'home', label: 'Hogar' },
	{ key: 'health', label: 'Salud' },
	{ key: 'education', label: 'Educación' },
	{ key: 'entertainment', label: 'Entretenimiento' },
	{ key: 'gift', label: 'Regalos' },
	{ key: 'travel', label: 'Viajes' },
	{ key: 'services', label: 'Servicios' },
	{ key: 'clothing', label: 'Ropa' },
	{ key: 'pets', label: 'Mascotas' },
	{ key: 'salary', label: 'Sueldo' }
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
export type CategoryIconKey = (typeof CATEGORY_ICONS)[number]['key'];
export type SwatchKey = (typeof SWATCHES)[number]['key'];

export const toIconKey = (s: string | null): AccountIconKey =>
	ACCOUNT_ICONS.some((i) => i.key === s) ? (s as AccountIconKey) : 'wallet';
/** Null when absent or not in CATEGORY_ICONS: callers keep the generic category fallback. */
export const toCategoryIconKey = (s: string | null): CategoryIconKey | null =>
	CATEGORY_ICONS.some((i) => i.key === s) ? (s as CategoryIconKey) : null;
export const toSwatchKey = (s: string | null): SwatchKey | null =>
	SWATCHES.some((w) => w.key === s) ? (s as SwatchKey) : null;
/** CSS colour for a category/account swatch; no colour falls back to the primary tone app-wide. */
export const swatchVar = (c: string | null | undefined) =>
	c ? `var(--swatch-${c})` : 'var(--primary)';
