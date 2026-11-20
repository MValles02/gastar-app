/** The value as a plain object, or an empty one when it is not (null, a primitive). */
export const obj = (v: unknown) =>
	v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
