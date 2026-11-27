import { es } from '#lib/copy/es.ts';
import { type Currency, isWholeFor } from '#lib/money.ts';

/** A posted text field; a missing or file field reads as ''. */
export const str = (fd: FormData, key: string) => {
	const v = fd.get(key);
	return typeof v === 'string' ? v : '';
};

export const readFields = <K extends string>(fd: FormData, keys: readonly K[]) =>
	Object.fromEntries(keys.map((k) => [k, str(fd, k)])) as Record<K, string>;

export const requiredText =
	(max: number, msgs: { empty: string; long: string }) =>
	(raw: string): { value: string; error?: string } => {
		const value = raw.trim();
		if (!value) return { value, error: msgs.empty };
		if (value.length > max) return { value, error: msgs.long };
		return { value };
	};

export const amountFor = (currency: Currency) => (cents: number) =>
	isWholeFor(cents, currency) ? undefined : es.common.amount.arsWhole;

/**
 * The form an edit action validates: the stored values (`toFormValues(row)`) with the posted
 * `editable` fields over them, so the create parser checks the result.
 */
export function editFormData(
	stored: Record<string, string>,
	posted: FormData,
	editable: readonly string[]
) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(stored)) fd.set(k, v);
	for (const k of editable) {
		const v = posted.get(k);
		if (typeof v === 'string') fd.set(k, v);
	}
	return fd;
}

/** On an undo (`undo=1`), the posted ids of `keys`: archived refs the undo may restore. */
export function undoArchivedOk(posted: FormData, keys: readonly string[]) {
	if (posted.get('undo') !== '1') return undefined;
	return keys
		.map((k) => posted.get(k))
		.filter((v): v is string => typeof v === 'string' && v !== '');
}
