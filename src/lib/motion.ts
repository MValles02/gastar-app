/**
 * Svelte transitions on the motion tokens in app.css (DESIGN.md "Motion"): the same durations and
 * curves, for elements that enter with `in:` or move with `animate:`. Under reduced motion nothing
 * moves; appearing elements keep a short opacity fade.
 */
import type { AnimationConfig } from 'svelte/animate';
import { quintOut } from 'svelte/easing';
import { fade as svelteFade, fly } from 'svelte/transition';
import { reducedMotion } from '#lib/swipe.ts';

/** Mirrors `--dur-fast`, `--dur-base` and `--dur-slow`. */
export const DUR_FAST = 120;
export const DUR_BASE = 200;
export const DUR_SLOW = 280;
/** The reduced-motion fade, as in app.css. */
const DUR_REDUCED = 100;
/** `--ease-out`: cubic-bezier(0.23, 1, 0.32, 1) is the quintic ease-out. */
export const easeOut = quintOut;

/** Something that shows up in place (an error, a block that swaps in): fade plus a 4px rise. */
export function appear(node: Element, { delay = 0 } = {}) {
	if (reducedMotion()) return svelteFade(node, { delay, duration: DUR_REDUCED });
	return fly(node, { delay, y: 4, duration: DUR_BASE, easing: easeOut });
}

/** A plain fade, for content that replaces content in the same spot; `skip` shows it at once. */
export function fade(node: Element, { delay = 0, skip = false } = {}) {
	if (skip) return { duration: 0 };
	return svelteFade(node, {
		delay,
		duration: reducedMotion() ? DUR_REDUCED : DUR_FAST,
		easing: easeOut
	});
}

// Each element's offset in its offset parent, as recorded by `recordOffsets` before an update.
let offsets = new WeakMap<Element, number>();

/**
 * Records the offset of every `[data-slide]` element under `root`; call it right before the list
 * updates. Without a root it forgets them, so the next update slides nothing.
 */
export function recordOffsets(root?: ParentNode) {
	offsets = new WeakMap();
	for (const el of root?.querySelectorAll<HTMLElement>('[data-slide]') ?? [])
		offsets.set(el, el.offsetTop);
}

/**
 * `animate:slide` for keyed lists that nest (months > days > rows): each element slides only by its
 * own move inside its offset parent, so nested moves add up instead of doubling. Needs `data-slide`
 * on the element, a positioned parent, and `recordOffsets` before the update.
 */
export const slide: (node: Element, rects: { from: DOMRect; to: DOMRect }) => AnimationConfig = (
	node
) => {
	const before = offsets.get(node);
	const dy = before === undefined ? 0 : before - (node as HTMLElement).offsetTop;
	if (!dy || reducedMotion()) return { duration: 0 };
	return {
		duration: DUR_BASE,
		easing: easeOut,
		css: (_t: number, u: number) => `transform: translateY(${u * dy}px)`
	};
};
