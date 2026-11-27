import { navigating } from '$app/state';
import { skipNextTransition } from '#lib/nav-stack.svelte.ts';
import {
	COMMIT_RATIO,
	DOMINANCE,
	EASE,
	EDGE_PX,
	FLICK_MIN_PX,
	FLICK_VELOCITY,
	LOCK_PX,
	SWIPING_CLASS,
	dialogOpen,
	isStandalone,
	ownsHorizontal,
	reducedMotion,
	velocity
} from '#lib/swipe.ts';
import { POLL_MS, RESET_SLACK_MS, SETTLE_MS, SLIDE_OUT_MS, SPRING_MS } from '#lib/constants.ts';

/**
 * Edge-swipe back for the installed PWA (iOS standalone has no system swipe-back). A touch that
 * starts within EDGE_PX of the left edge and drags right moves the page with the finger; releasing
 * past COMMIT_RATIO of the width, or with a fast flick, clicks the screen's own "up" control
 * (`[data-edge-back]` in Header, which runs `upOnClick` -> `navigateUp`), so the swipe and the
 * back button share one code path. Otherwise the page springs back.
 *
 * Only active when the screen has such a control (sub-screens; tabs and auth screens have none),
 * no dialog/drawer is open, and the app runs standalone: in a Safari tab the system edge swipe
 * already exists and ours would fight it. On Android the system back gesture takes the touch first
 * (we get `touchcancel` and spring back). Touch only: no effect with a mouse.
 */

/** The screen's "up" control (Header's `data-edge-back`), which a committed swipe clicks. */
const BACK_SELECTOR = '[data-edge-back]';

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
		root.classList.remove(SWIPING_CLASS);
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
		if (!el || dialogOpen() || ownsHorizontal(e.target, true)) return;
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
				root.classList.add(SWIPING_CLASS);
				node.style.transition = 'none';
				node.style.willChange = 'transform';
				node.style.background = 'var(--bg)';
				node.style.boxShadow = 'var(--shadow-swipe)';
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
		const v = velocity(samples);
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
