import { navigating } from '$app/state';
import { skipNextTransition } from '#lib/nav-stack.svelte.ts';

/**
 * Edge-swipe back for the installed PWA (iOS standalone has no system swipe-back). A touch that
 * starts within EDGE_PX of the left edge and drags right moves the page with the finger; releasing
 * past COMMIT_RATIO of the width, or with a fast flick, clicks the screen's own "up" control
 * (`[data-edge-back]` in PageHeader, which runs `upOnClick` -> `navigateUp`), so the swipe and the
 * back button share one code path. Otherwise the page springs back.
 *
 * Only active when the screen has such a control (sub-screens; tabs and auth screens have none),
 * no dialog/drawer is open, and the app runs standalone: in a Safari tab the system edge swipe
 * already exists and ours would fight it. On Android the system back gesture takes the touch first
 * (we get `touchcancel` and spring back). Touch only: no effect with a mouse.
 */
const EDGE_PX = 20;
const LOCK_PX = 10;
/** Horizontal movement must exceed vertical by this factor to claim the gesture. */
const DOMINANCE = 1.5;
const COMMIT_RATIO = 0.35;
/** px/ms over the last samples, plus a minimum travel, for a flick. */
const FLICK_VELOCITY = 0.5;
const FLICK_MIN_PX = 40;
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
/** The spring back to place; the page resets RESET_SLACK_MS after it ends. */
const SPRING_MS = 280;
const RESET_SLACK_MS = 20;
/** The slide off-screen after a committed swipe; the navigation starts when it ends. */
const SLIDE_OUT_MS = 200;
/** Wait this long for the new page to land, then re-check every POLL_MS while a navigation is pending. */
const SETTLE_MS = 1500;
const POLL_MS = 300;

/** The screen's "up" control (PageHeader's `data-edge-back`), which a committed swipe clicks. */
const BACK_SELECTOR = '[data-edge-back]';
/** An open bits-ui dialog or vaul drawer (BottomDrawer): no swipe while one is up. */
const OVERLAY_SELECTOR = '[role="dialog"], [data-vaul-drawer]';

const isStandalone = () =>
	matchMedia('(display-mode: standalone)').matches ||
	(navigator as Navigator & { standalone?: boolean }).standalone === true;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const dialogOpen = () => !!document.querySelector(OVERLAY_SELECTOR);

/** True when the touch starts on something that owns horizontal drags or text. */
function ownsHorizontal(target: EventTarget | null) {
	for (let el = target as Element | null; el && el !== document.body; el = el.parentElement) {
		if (el.matches('input, textarea, select, [contenteditable], [role="slider"]')) return true;
		if (el.scrollWidth > el.clientWidth && el.scrollLeft > 0) {
			const ox = getComputedStyle(el).overflowX;
			if (ox === 'auto' || ox === 'scroll') return true;
		}
	}
	return false;
}

let restore: (() => void) | null = null;

/** Called after every landed navigation: puts a page that was swiped away back in place. */
export function settleEdgeSwipe() {
	restore?.();
}

export function edgeSwipeBack(node: HTMLElement) {
	let backEl: HTMLElement | null = null;
	let startX = 0;
	let startY = 0;
	let dx = 0;
	let claimed = false;
	let samples: { x: number; t: number }[] = [];
	let raf = 0;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;

	const root = document.documentElement;

	function reset() {
		clearTimeout(settleTimer);
		restore = null;
		node.style.transition = 'none';
		node.style.transform = '';
		node.style.boxShadow = '';
		node.style.background = '';
		root.classList.remove('edge-swiping');
		node.style.willChange = '';
	}

	function paint() {
		raf = 0;
		node.style.transform = `translate3d(${dx}px,0,0)`;
	}

	function stopListening() {
		removeEventListener('touchmove', onmove);
		removeEventListener('touchend', onend);
		removeEventListener('touchcancel', oncancel);
	}

	function onstart(e: TouchEvent) {
		if (e.touches.length !== 1 || restore) return;
		const t = e.touches[0];
		if (t.clientX > EDGE_PX || !isStandalone()) return;
		const el = document.querySelector<HTMLElement>(BACK_SELECTOR);
		if (!el || dialogOpen() || ownsHorizontal(e.target)) return;
		if (!getSelection()?.isCollapsed) return;
		backEl = el;
		startX = t.clientX;
		startY = t.clientY;
		dx = 0;
		claimed = false;
		samples = [{ x: t.clientX, t: e.timeStamp }];
		// Not passive: once the gesture is claimed we must stop the page from scrolling.
		addEventListener('touchmove', onmove, { passive: false });
		addEventListener('touchend', onend, { passive: true });
		addEventListener('touchcancel', oncancel, { passive: true });
	}

	function onmove(e: TouchEvent) {
		const t = e.touches[0];
		const mx = t.clientX - startX;
		const my = t.clientY - startY;
		if (!claimed) {
			if (Math.hypot(mx, my) < LOCK_PX) return;
			if (mx <= 0 || mx < Math.abs(my) * DOMINANCE) {
				stopListening(); // vertical scroll, or leftwards: not ours
				return;
			}
			claimed = true;
			if (!reducedMotion()) {
				root.classList.add('edge-swiping');
				node.style.transition = 'none';
				node.style.willChange = 'transform';
				node.style.background = 'var(--bg)';
				node.style.boxShadow = '-12px 0 24px -12px rgb(0 0 0 / 0.25)';
			}
		}
		e.preventDefault();
		dx = Math.max(0, mx);
		samples.push({ x: t.clientX, t: e.timeStamp });
		if (samples.length > 6) samples.shift();
		if (!reducedMotion() && !raf) raf = requestAnimationFrame(paint);
	}

	function springBack() {
		stopListening();
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
		if (reducedMotion()) return reset();
		node.style.transition = `transform ${SPRING_MS}ms ${EASE}`;
		node.style.transform = 'translate3d(0,0,0)';
		setTimeout(reset, SPRING_MS + RESET_SLACK_MS);
	}

	function oncancel() {
		if (claimed) springBack();
		else stopListening();
	}

	function onend() {
		stopListening();
		if (!claimed || !backEl) return;
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
		const first = samples[0];
		const last = samples[samples.length - 1];
		const v = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
		const commit = dx > innerWidth * COMMIT_RATIO || (v > FLICK_VELOCITY && dx > FLICK_MIN_PX);
		if (!commit) return springBack();

		const go = backEl;
		if (reducedMotion()) {
			reset();
			go.click();
			return;
		}
		// Slide the rest of the way out, then navigate with the page transition suppressed (the
		// finger already did it) and keep the page off-screen until the new one has landed.
		node.style.transition = `transform ${SLIDE_OUT_MS}ms ${EASE}`;
		node.style.transform = `translate3d(${innerWidth}px,0,0)`;
		restore = reset;
		setTimeout(() => {
			skipNextTransition();
			go.click();
			const waitSettle = () => {
				if (!restore) return;
				if (navigating.to) settleTimer = setTimeout(waitSettle, POLL_MS);
				else reset();
			};
			settleTimer = setTimeout(waitSettle, SETTLE_MS);
		}, SLIDE_OUT_MS);
	}

	// On the document, not the node: the edge strip may sit outside `main`'s box.
	document.addEventListener('touchstart', onstart, { passive: true });

	return {
		destroy() {
			document.removeEventListener('touchstart', onstart);
			stopListening();
			reset();
		}
	};
}
