import { toIconKey, toSwatchKey } from '$lib/appearance';

/** The base picker option of an account row; callers spread it and add their own extra fields. */
export const accountOption = (a: {
	id: string;
	name: string;
	icon: string | null;
	color: string | null;
}) => ({
	id: a.id,
	name: a.name,
	icon: toIconKey(a.icon),
	color: toSwatchKey(a.color)
});
