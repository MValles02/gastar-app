/**
 * Touch press feedback for list rows, like a native iOS list: a row under the finger gets
 * `data-pressed` only once the finger has rested on it for PRESS_DELAY_MS without moving, and
 * loses it as soon as the finger moves past MOVE_PX or anything scrolls. A quick tap still flashes
 * it for TAP_FLASH_MS. CSS styles `[data-pressed]` (app.css and the components marked
 * `data-press`); mouse pointers keep plain `:active`.
 *
 * iOS Safari applies `:active` on touchstart, before it knows whether the touch is a scroll, so
 * rows lit up under every scroll and swipe; that is why touch uses this instead.
 */
const PRESSABLE = "a[data-slot='item'], button[data-slot='item'], [data-press]";
const PRESS_DELAY_MS = 120;
const TAP_FLASH_MS = 100;
const MOVE_PX = 10;

export function pressFeedback(doc: Document) {
	let el: HTMLElement | null = null;
	let x = 0;
	let y = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const press = (on: boolean) => {
		if (on) el?.setAttribute('data-pressed', '');
		else el?.removeAttribute('data-pressed');
	};
	const cancel = () => {
		clearTimeout(timer);
		press(false);
		el = null;
	};
	const onstart = (e: TouchEvent) => {
		cancel();
		if (e.touches.length !== 1) return;
		el = (e.target as Element | null)?.closest<HTMLElement>(PRESSABLE) ?? null;
		if (!el) return;
		({ clientX: x, clientY: y } = e.touches[0]);
		timer = setTimeout(() => press(true), PRESS_DELAY_MS);
	};
	const onmove = (e: TouchEvent) => {
		const t = e.touches[0];
		if (el && Math.hypot(t.clientX - x, t.clientY - y) > MOVE_PX) cancel();
	};
	const onend = () => {
		if (!el) return;
		clearTimeout(timer);
		const tapped = el;
		tapped.setAttribute('data-pressed', '');
		el = null;
		timer = setTimeout(() => tapped.removeAttribute('data-pressed'), TAP_FLASH_MS);
	};

	const opts = { capture: true, passive: true };
	doc.addEventListener('touchstart', onstart, opts);
	doc.addEventListener('touchmove', onmove, opts);
	doc.addEventListener('touchend', onend, opts);
	doc.addEventListener('touchcancel', cancel, opts);
	doc.addEventListener('scroll', cancel, opts);
	return () => {
		cancel();
		doc.removeEventListener('touchstart', onstart, opts);
		doc.removeEventListener('touchmove', onmove, opts);
		doc.removeEventListener('touchend', onend, opts);
		doc.removeEventListener('touchcancel', cancel, opts);
		doc.removeEventListener('scroll', cancel, opts);
	};
}
