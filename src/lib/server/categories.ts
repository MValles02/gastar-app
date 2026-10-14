import { NAME_MAX_LENGTH } from '$lib/limits';
import { CATEGORY_ICONS, SWATCHES } from '../appearance';
import type { Currency } from '$lib/money';

export const NOT_FOUND_MESSAGE = 'Categoría no encontrada.';
export const DUPLICATE_NAME_MESSAGE = 'Ya tenés una categoría con ese nombre.';
export const DELETE_REFERENCED_MESSAGE = 'Esta categoría tiene movimientos. Podés archivarla.';

export const KIND_LOCKED_MESSAGE = 'Tiene movimientos, solo se puede cambiar a Ambos.';

export type CategoryData = {
	name: string;
	color: string;
	icon: string | null;
	kind: 'income' | 'outcome' | null;
};

/** Changing to income/outcome needs every income/outcome movement to be of that type; Ambos (null) is always allowed. */
export const kindAllowed = (kind: CategoryData['kind'], movementTypes: string[]) =>
	kind === null || movementTypes.every((t) => t === kind);
export type CategoryFormErrors = Partial<Record<keyof CategoryData, string>>;
export type CategoryFormResult =
	| { ok: true; data: CategoryData }
	| { ok: false; values: Record<string, string>; errors: CategoryFormErrors };

const str = (fd: FormData, key: string) => {
	const v = fd.get(key);
	return typeof v === 'string' ? v : '';
};

export function parseCategoryForm(fd: FormData): CategoryFormResult {
	const values = {
		name: str(fd, 'name'),
		color: str(fd, 'color'),
		icon: str(fd, 'icon'),
		kind: str(fd, 'kind')
	};
	const errors: CategoryFormErrors = {};

	const name = values.name.trim();
	if (!name) errors.name = 'Ingresá un nombre.';
	else if (name.length > NAME_MAX_LENGTH)
		errors.name = `El nombre puede tener hasta ${NAME_MAX_LENGTH} caracteres.`;
	if (!SWATCHES.some((s) => s.key === values.color)) errors.color = 'Elegí un color.';
	// '' (or a missing field) means no icon.
	if (values.icon !== '' && !CATEGORY_ICONS.some((i) => i.key === values.icon))
		errors.icon = 'Elegí un ícono.';
	// '' (or a missing field) means both.
	const kind = values.kind === 'income' || values.kind === 'outcome' ? values.kind : null;
	if (values.kind !== '' && !kind) errors.kind = 'Elegí un tipo.';

	if (Object.keys(errors).length > 0) return { ok: false, values, errors };
	return { ok: true, data: { name, color: values.color, icon: values.icon || null, kind } };
}

/** Net per currency (outcomes minus incomes), ARS first. Never sums across currencies. */
export function toCurrencyNets(
	rows: { currency: Currency; outcome: number; income: number }[]
): { currency: Currency; net: number }[] {
	return rows
		.map((r) => ({ currency: r.currency, net: r.outcome - r.income }))
		.sort((a, b) => (a.currency === b.currency ? 0 : a.currency === 'ARS' ? -1 : 1));
}
