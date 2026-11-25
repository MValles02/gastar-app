/**
 * Shared pieces of the page-drag gestures (edge-swipe back, pull-to-refresh): the claim
 * thresholds, the release rules and the motion values, so the gestures feel the same.
 */

/** Width of the screen-edge zones: the left one belongs to swipe back (ours or the system's). */
export const EDGE_PX = 20;
export const LOCK_PX = 10;
/** Horizontal movement must exceed vertical by this factor to claim the gesture. */
export const DOMINANCE = 1.5;
export const COMMIT_RATIO = 0.35;
/** px/ms over the last samples, plus a minimum travel, for a flick. */
export const FLICK_VELOCITY = 0.5;
export const FLICK_MIN_PX = 40;
export const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
/** The spring back to place; the page resets RESET_SLACK_MS after it ends. */
export const SPRING_MS = 280;
export const RESET_SLACK_MS = 20;
/** The slide off-screen after a committed swipe; the navigation starts when it ends. */
export const SLIDE_OUT_MS = 200;
/** Wait this long for the new page to land, then re-check every POLL_MS while a navigation is pending. */
export const SETTLE_MS = 1500;
export const POLL_MS = 300;
/** Set on <html> while a page is dragged, so a page pushed past the edge adds no horizontal scroll. */
export const SWIPING_CLASS = 'page-swiping';

/** An open bits-ui dialog or vaul drawer (BottomDrawer): no swipe while one is up. */
const OVERLAY_SELECTOR = '[role="dialog"], [data-vaul-drawer]';

export const isStandalone = () =>
	matchMedia('(display-mode: standalone)').matches ||
	(navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * The installed iOS app (home-screen web app): the one standalone mode with no native
 * pull-to-refresh. `navigator.standalone` exists only on iOS, so Android never matches.
 */
export const isIOSStandalone = () =>
	(navigator as Navigator & { standalone?: boolean }).standalone === true &&
	matchMedia('(display-mode: standalone)').matches;

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const dialogOpen = () => !!document.querySelector(OVERLAY_SELECTOR);

/**
 * True when the touch starts on something that owns horizontal drags or text: an input, a slider,
 * or a horizontal scroller (any one that can scroll, or with `scrolledOnly` only one already
 * scrolled away from its start, which a rightward edge swipe could otherwise not reach).
 */
export function ownsHorizontal(target: EventTarget | null, scrolledOnly = false) {
	for (let el = target as Element | null; el && el !== document.body; el = el.parentElement) {
		if (el.matches('input, textarea, select, [contenteditable], [role="slider"]')) return true;
		if (el.scrollWidth > el.clientWidth && (!scrolledOnly || el.scrollLeft > 0)) {
			const ox = getComputedStyle(el).overflowX;
			if (ox === 'auto' || ox === 'scroll') return true;
		}
	}
	return false;
}

/** iOS-style rubber band: travel `x` past a boundary moves a shrinking fraction of it (`size`: the axis length). */
export function rubber(x: number, size: number) {
	return Math.sign(x) * (1 - 1 / ((Math.abs(x) * 0.55) / size + 1)) * size;
}

/** The inverse of `rubber`: the finger travel that produced a displayed offset. */
export function unrubber(y: number, size: number) {
	return (Math.sign(y) * (1 / (1 - Math.abs(y) / size) - 1) * size) / 0.55;
}

/** Horizontal velocity in px/ms over the kept touch samples. */
export function velocity(samples: { x: number; t: number }[]) {
	const first = samples[0];
	const last = samples[samples.length - 1];
	return last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
}
