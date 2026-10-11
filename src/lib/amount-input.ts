import { parseAmount } from './money';

/**
 * Progressive enhancement for amount inputs: strips the "." grouping on focus (mobile keypads have
 * no "." key, so appending a digit would otherwise give an invalid "650.0001") and regroups on blur.
 * Invalid input is never touched. Usable as a Svelte action or as `{@attach groupedAmount}`.
 */
export function groupedAmount(node: HTMLInputElement) {
	const set = (value: string) => {
		if (value === node.value) return;
		node.value = value;
		node.dispatchEvent(new Event('input', { bubbles: true }));
	};
	const onFocus = () => {
		const { value, selectionStart: s, selectionEnd: e } = node;
		if (!value.includes('.') || parseAmount(value) === null) return;
		set(value.replaceAll('.', ''));
		// Keep the selection (a full selection stays full) so typing/fill replaces as expected.
		const dots = (pos: number | null) => value.slice(0, pos ?? 0).replaceAll('.', '').length;
		if (s !== null && e !== null) node.setSelectionRange(dots(s), dots(e));
	};
	const onBlur = () => {
		const m = /^(-?)(\d+)(,\d+)?$/.exec(node.value);
		if (m) set(`${m[1]}${m[2].replace(/\B(?=(\d{3})+$)/g, '.')}${m[3] ?? ''}`);
	};
	if (document.activeElement === node) onFocus(); // autofocus may land before the listener
	node.addEventListener('focus', onFocus);
	node.addEventListener('blur', onBlur);
	return () => {
		node.removeEventListener('focus', onFocus);
		node.removeEventListener('blur', onBlur);
	};
}
