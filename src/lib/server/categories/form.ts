import { NAME_MAX_LENGTH, tooLongMessage } from '#lib/fields.ts';
import { CATEGORY_ICONS, SWATCHES, toCategoryIconKey, toSwatchKey } from '#lib/appearance.ts';
import { CATEGORY_KINDS, type CategoryKind } from '#lib/movement.ts';
import { editFormData, readFields, requiredText } from '../forms';

export const NOT_FOUND_MESSAGE = 'Categoría no encontrada.';
export const DUPLICATE_NAME_MESSAGE = 'Ya tenés una categoría con ese nombre.';
export const DELETE_REFERENCED_MESSAGE = 'Esta categoría tiene movimientos. Podés archivarla.';
export const KIND_LOCKED_MESSAGE = 'Tiene movimientos, solo se puede cambiar a Ambos.';

export const FIELDS = ['name', 'color', 'icon', 'kind'] as const;
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

const nameField = requiredText(NAME_MAX_LENGTH, {
	empty: 'Ingresá un nombre.',
	long: tooLongMessage('El nombre', NAME_MAX_LENGTH)
});

export const toFormValues = (c: {
	name: string;
	icon: string | null;
	color: string | null;
	kind: string | null;
}) => ({
	name: c.name,
	icon: toCategoryIconKey(c.icon) ?? '',
	color: toSwatchKey(c.color) ?? 'green',
	kind: c.kind ?? ''
});

export const editedForm = (row: Parameters<typeof toFormValues>[0], posted: FormData) =>
	editFormData(toFormValues(row), posted, EDITABLE);

export function parseCategoryForm(fd: FormData): CategoryFormResult {
	const values = readFields(fd, FIELDS);
	const errors: CategoryFormErrors = {};

	const name = nameField(values.name);
	if (name.error) errors.name = name.error;
	if (!SWATCHES.some((s) => s.key === values.color)) errors.color = 'Elegí un color.';
	// '' (or a missing field) means no icon.
	if (values.icon !== '' && !CATEGORY_ICONS.some((i) => i.key === values.icon))
		errors.icon = 'Elegí un ícono.';
	// '' (or a missing field) means both.
	const kind = CATEGORY_KINDS.find((k) => k === values.kind) ?? null;
	if (values.kind !== '' && !kind) errors.kind = 'Elegí un tipo.';

	if (Object.keys(errors).length > 0) return { ok: false, values, errors };
	return {
		ok: true,
		data: { name: name.value, color: values.color, icon: values.icon || null, kind }
	};
}
