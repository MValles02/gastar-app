/** A plain amount while typing: optional "-", digits, optional ",decimals" (no thousands dots). */
const PLAIN = /^-?\d*(,\d*)?$/;
/** The same with valid "." thousands. "1.5" is neither, so it is left alone for validation. */
const GROUPED = /^-?\d{1,3}(\.\d{3})+(,\d*)?$/;
const isAmount = (value: string) => PLAIN.test(value) || GROUPED.test(value);

/** `raw` (no dots) with "." thousands in its whole part. */
const group = (raw: string) =>
	raw.replace(
		/^(-?)(\d+)/,
		(_, sign: string, int: string) => sign + int.replace(/\B(?=(\d{3})+$)/g, '.')
	);

/** How many non-dot characters precede `pos` in `value`. */
const rawIndex = (value: string, pos: number) => value.slice(0, pos).replaceAll('.', '').length;

/**
 * Progressive enhancement for amount inputs: the value shows "." thousands while the user types,
 * and the caret stays on the same digit. Mobile keypads have no "." key and iOS applies an edit to
 * the text it last saw, so typing and deleting are applied here on the plain number (`beforeinput`,
 * cancelled) and the result is regrouped: Backspace right after a "." deletes the digit before it.
 * A "." typed (some decimal keypads) becomes the "," decimal separator. Anything else (paste,
 * autocorrect, word deletion) goes through the browser and is regrouped on `input`; text that is not
 * a plain number is never touched. Usable as a Svelte action or as `{@attach groupedAmount}`.
 */
export function groupedAmount(node: HTMLInputElement) {
	/** Show `raw` grouped with the caret after its first `caret` characters, and tell bound state. */
	const render = (raw: string, caret: number) => {
		const grouped = group(raw);
		let pos = 0;
		while (caret > 0 && pos < grouped.length) if (grouped[pos++] !== '.') caret--;
		node.value = grouped;
		node.setSelectionRange(pos, pos);
		node.dispatchEvent(new Event('input', { bubbles: true }));
	};

	const onBeforeInput = (e: InputEvent) => {
		const { value, selectionStart, selectionEnd } = node;
		if (!isAmount(value) || selectionStart === null || selectionEnd === null) return;
		const raw = value.replaceAll('.', '');
		let s = rawIndex(value, selectionStart);
		let end = rawIndex(value, selectionEnd);
		let text = '';
		if (e.inputType === 'insertText' && e.data === '.') text = ',';
		else if (e.inputType === 'insertText' && e.data && !e.data.includes('.')) text = e.data;
		else if (e.inputType === 'deleteContentBackward') {
			if (s === end) s = Math.max(0, s - 1);
		} else if (e.inputType === 'deleteContentForward') {
			if (s === end) end = Math.min(raw.length, end + 1);
		} else return;
		const next = raw.slice(0, s) + text + raw.slice(end);
		if (!PLAIN.test(next)) return; // not a number: let the browser apply it (validation reports it)
		e.preventDefault();
		render(next, s + text.length);
	};

	const regroup = (e: Event) => {
		if (!e.isTrusted && e.type === 'input') return; // our own re-announcement
		const { value, selectionStart } = node;
		const raw = value.replaceAll('.', '');
		if (!isAmount(value) || group(raw) === value) return;
		render(raw, rawIndex(value, selectionStart ?? value.length));
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
