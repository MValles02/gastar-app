import { fail } from '@sveltejs/kit';

/**
 * What a failed form action returns: the posted `values` to refill the form, `errors` keyed by
 * field, and `formError` for a message that belongs to the whole form.
 */
export type FormFailure<V extends object = Record<string, string>, E = Record<string, string>> = {
	values?: V;
	errors?: E;
	formError?: string;
};

/** `fail(status, data)` restricted to the shared FormFailure shape. */
export const formFail = <V extends object, E extends object>(
	status: number,
	data: FormFailure<V, E>
) => fail(status, data);
