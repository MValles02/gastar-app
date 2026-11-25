import { parseAmount } from './money';

/**
 * Progressive enhancement for amount inputs. Mobile keypads have no "." key, so editing a grouped
 * value in place ("650.000" + "1" = "650.0001") would fail validation. Right before an edit
 * (`beforeinput`), a valid grouped value drops its "." (keeping the caret/selection), so Backspace
 * right after a "." deletes the digit before it and forward Delete before a "." the digit after it.
 * Right after the edit (`input`) a plain number (digits, optional ",decimals", optional leading "-")
 * is regrouped live with "." thousands, keeping the "," decimals as typed and the caret on the same
 * digit; blur regroups too as a fallback. Invalid input is never touched. Usable as a Svelte action
 * or as `{@attach groupedAmount}`.
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
	const regroup = () => {
		const { value, selectionStart: s } = node;
		const m = /^(-?)(\d+)(,\d*)?$/.exec(value);
		if (!m) return;
		const grouped = `${m[1]}${m[2].replace(/\B(?=(\d{3})+$)/g, '.')}${m[3] ?? ''}`;
		if (grouped === value) return;
		// Keep the caret after the same number of digits/commas/minus signs, whatever dots precede it.
		let keep = value.slice(0, s ?? value.length).replaceAll('.', '').length;
		let pos = 0;
		while (keep > 0 && pos < grouped.length) if (grouped[pos++] !== '.') keep--;
		node.value = grouped;
		node.setSelectionRange(pos, pos);
		// Bound state read the ungrouped value on the original event: re-announce the final one.
		node.dispatchEvent(new Event('input', { bubbles: true }));
	};
	node.addEventListener('beforeinput', onBeforeInput);
	node.addEventListener('input', regroup);
	node.addEventListener('blur', regroup);
	return () => {
		node.removeEventListener('beforeinput', onBeforeInput);
		node.removeEventListener('input', regroup);
		node.removeEventListener('blur', regroup);
	};
}
