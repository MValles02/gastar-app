import { parseAmount } from './money';

/**
 * Progressive enhancement for amount inputs. Mobile keypads have no "." key, so editing a grouped
 * value in place ("650.000" + "1" = "650.0001") would fail validation. Right before an edit, a valid
 * grouped value drops its "." (keeping the caret/selection), and on blur a plain number is regrouped.
 * Invalid input is never touched. Usable as a Svelte action or as `{@attach groupedAmount}`.
 */
export function groupedAmount(node: HTMLInputElement) {
	const onBeforeInput = () => {
		const { value, selectionStart: s, selectionEnd: e } = node;
		if (!value.includes('.') || parseAmount(value) === null) return;
		const ungrouped = (pos: number | null) => value.slice(0, pos ?? 0).replaceAll('.', '').length;
		// The edit itself fires `input` right after, so bound state picks this up with it.
		node.value = value.replaceAll('.', '');
		node.setSelectionRange(ungrouped(s), ungrouped(e));
	};
	const onBlur = () => {
		const m = /^(-?)(\d+)(,\d+)?$/.exec(node.value);
		if (!m) return;
		const grouped = `${m[1]}${m[2].replace(/\B(?=(\d{3})+$)/g, '.')}${m[3] ?? ''}`;
		if (grouped === node.value) return;
		node.value = grouped;
		node.dispatchEvent(new Event('input', { bubbles: true }));
	};
	node.addEventListener('beforeinput', onBeforeInput);
	node.addEventListener('blur', onBlur);
	return () => {
		node.removeEventListener('beforeinput', onBeforeInput);
		node.removeEventListener('blur', onBlur);
	};
}
