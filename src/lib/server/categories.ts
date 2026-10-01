import { SWATCHES } from '../appearance';
import type { Currency } from './dashboard';

export const DUPLICATE_NAME_MESSAGE = 'Ya tenés una categoría con ese nombre.';
export const DELETE_REFERENCED_MESSAGE = 'Esta categoría tiene movimientos. Podés archivarla.';

export type CategoryData = { name: string; color: string };
export type CategoryFormErrors = Partial<Record<keyof CategoryData, string>>;
export type CategoryFormResult =
	| { ok: true; data: CategoryData }
	| { ok: false; values: Record<string, string>; errors: CategoryFormErrors };

const str = (fd: FormData, key: string) => {
	const v = fd.get(key);
	return typeof v === 'string' ? v : '';
};

export function parseCategoryForm(fd: FormData): CategoryFormResult {
	const values = { name: str(fd, 'name'), color: str(fd, 'color') };
	const errors: CategoryFormErrors = {};

	const name = values.name.trim();
	if (!name) errors.name = 'Ingresá un nombre.';
	else if (name.length > 40) errors.name = 'El nombre puede tener hasta 40 caracteres.';
	if (!SWATCHES.some((s) => s.key === values.color)) errors.color = 'Elegí un color.';

	if (Object.keys(errors).length > 0) return { ok: false, values, errors };
	return { ok: true, data: { name, color: values.color } };
}

/** Net per currency (outcomes minus incomes), ARS first. Never sums across currencies. */
export function toCurrencyNets(
	rows: { currency: Currency; outcome: number; income: number }[]
): { currency: Currency; net: number }[] {
	return rows
		.map((r) => ({ currency: r.currency, net: r.outcome - r.income }))
		.sort((a, b) => (a.currency === b.currency ? 0 : a.currency === 'ARS' ? -1 : 1));
}
