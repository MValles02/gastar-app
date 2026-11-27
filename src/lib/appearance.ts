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
	{ key: 'tag', label: 'Etiqueta' },
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
	{ key: 'sky', label: 'Celeste' },
	{ key: 'blue', label: 'Azul' },
	{ key: 'indigo', label: 'Índigo' },
	{ key: 'violet', label: 'Violeta' },
	{ key: 'plum', label: 'Ciruela' },
	{ key: 'pink', label: 'Rosa' },
	{ key: 'red', label: 'Rojo' },
	{ key: 'orange', label: 'Naranja' },
	{ key: 'amber', label: 'Ámbar' },
	{ key: 'ochre', label: 'Ocre' },
	{ key: 'olive', label: 'Oliva' },
	{ key: 'brown', label: 'Marrón' },
	{ key: 'slate', label: 'Pizarra' },
	{ key: 'gray', label: 'Gris' }
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

type Stored = { icon: string | null; color: string | null };

/** An account's icon and swatch as stored, mapped to known keys (unknown icon → 'wallet'). */
export const accountLook = (a: Stored) => ({
	icon: toIconKey(a.icon),
	color: toSwatchKey(a.color)
});

/** A category's icon and swatch as stored; an unknown icon falls back to `fallback` (the generic glyph by default). */
export function categoryLook(c: Stored): {
	icon: CategoryIconKey | 'categories';
	color: SwatchKey | null;
};
export function categoryLook(
	c: Stored,
	fallback: null
): { icon: CategoryIconKey | null; color: SwatchKey | null };
export function categoryLook(c: Stored, fallback: 'categories' | null = 'categories') {
	return { icon: toCategoryIconKey(c.icon) ?? fallback, color: toSwatchKey(c.color) };
}

/** CSS colour for a category/account swatch; no colour falls back to the primary tone app-wide. */
export const swatchVar = (c: string | null | undefined) =>
	c ? `var(--swatch-${c})` : 'var(--primary)';

/** What a component's `data-tone` can name: a money tone, a state tone or a swatch. */
export type Tone = 'income' | 'expense' | 'neutral' | 'muted' | 'warning' | 'primary' | SwatchKey;

/** A stored swatch as a tone; no (or unknown) colour falls back to primary, like `swatchVar`. */
export const toneOf = (c: string | null | undefined): Tone => toSwatchKey(c ?? null) ?? 'primary';
