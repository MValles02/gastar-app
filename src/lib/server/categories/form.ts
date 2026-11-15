import { NAME_MAX_LENGTH, tooLongMessage } from '#lib/fields.ts';
import { CATEGORY_ICONS, SWATCHES } from '#lib/appearance.ts';
import { CATEGORY_KINDS, type CategoryKind } from '#lib/movement.ts';

export const NOT_FOUND_MESSAGE = 'Categoría no encontrada.';
export const DUPLICATE_NAME_MESSAGE = 'Ya tenés una categoría con ese nombre.';
export const DELETE_REFERENCED_MESSAGE = 'Esta categoría tiene movimientos. Podés archivarla.';
export const KIND_LOCKED_MESSAGE = 'Tiene movimientos, solo se puede cambiar a Ambos.';

export const FIELDS = ['name', 'color', 'icon', 'kind'] as const;
/** The only fields `?/update` takes. */
export const EDITABLE = ['name', 'icon', 'color', 'kind'] as const;

export type CategoryData = {
	name: string;
	color: string;
	icon: string | null;
	kind: CategoryKind | null;
};
export type CategoryFormErrors = Partial<Record<keyof CategoryData, string>>;
export type CategoryFormResult =
	| { ok: true; data: CategoryData }
	| { ok: false; values: Record<string, string>; errors: CategoryFormErrors };

const str = (fd: FormData, key: string) => {
	const v = fd.get(key);
	return typeof v === 'string' ? v : '';
};

export function parseCategoryForm(fd: FormData): CategoryFormResult {
	const values = Object.fromEntries(FIELDS.map((k) => [k, str(fd, k)])) as Record<
		(typeof FIELDS)[number],
		string
	>;
	const errors: CategoryFormErrors = {};

	const name = values.name.trim();
	if (!name) errors.name = 'Ingresá un nombre.';
	else if (name.length > NAME_MAX_LENGTH)
		errors.name = tooLongMessage('El nombre', NAME_MAX_LENGTH);
	if (!SWATCHES.some((s) => s.key === values.color)) errors.color = 'Elegí un color.';
	// '' (or a missing field) means no icon.
	if (values.icon !== '' && !CATEGORY_ICONS.some((i) => i.key === values.icon))
		errors.icon = 'Elegí un ícono.';
	// '' (or a missing field) means both.
	const kind = CATEGORY_KINDS.find((k) => k === values.kind) ?? null;
	if (values.kind !== '' && !kind) errors.kind = 'Elegí un tipo.';

	if (Object.keys(errors).length > 0) return { ok: false, values, errors };
	return { ok: true, data: { name, color: values.color, icon: values.icon || null, kind } };
}
