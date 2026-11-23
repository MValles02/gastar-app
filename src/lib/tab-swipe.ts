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
	POLL_MS,
	RESET_SLACK_MS,
	SETTLE_MS,
	SLIDE_OUT_MS,
	SPRING_MS,
	SWIPING_CLASS,
	dialogOpen,
	isStandalone,
	ownsHorizontal,
	reducedMotion,
	rubber,
	velocity
} from '#lib/swipe.ts';

/**
 * Swipe between tabs in the installed PWA, like a pager: on a tab screen a horizontal drag moves
 * the page with the finger (left toward the next tab in the bar, right toward the previous one).
 * Releasing past COMMIT_RATIO of the width, or with a flick, slides the page out and clicks the
 * target tab's link in the bar (`[data-tab-link]` in TabBar), so swipe and tap share one code path;
 * the new page then slides in from the other side. Otherwise the page springs back. Past the first
 * or last tab the page rubber-bands and never navigates.
 *
 * The page follows over the plain background (no live peek of the neighbour: it would need that
 * page's data loaded during the drag). Only active when the tab bar is shown (the four tab screens),
 * no dialog/drawer is open, the touch starts outside both EDGE_PX edge zones and not on a horizontal
 * scroller, input, slider or text selection, and the app runs standalone: in a Safari tab the
 * browser's own edge swipes (back/forward) would compete with it. Touch only.
 */
const TAB_LINK = '[data-tab-link]';
/** A soft shadow on both vertical edges of the dragged page, whichever side it uncovers. */
const SHADOW = '-12px 0 24px -12px rgb(0 0 0 / 0.25), 12px 0 24px -12px rgb(0 0 0 / 0.25)';
/** Shortest slide-out, for a fast flick that already carries the page most of the way. */
const SLIDE_OUT_MIN_MS = 120;

let restore: (() => void) | null = null;

/** Called after every landed navigation: slides the new tab in after a committed swipe. */
export function settleTabSwipe() {
	restore?.();
}

export function tabSwipe(node: HTMLElement) {
	let links: HTMLAnchorElement[] = [];
	let current = -1;
	let startX = 0;
	let startY = 0;
	/** Where the page was when the finger came down (non-zero when it caught a moving page). */
	let base = 0;
	let dx = 0;
	let claimed = false;
	let samples: { x: number; t: number }[] = [];
	let raf = 0;
	let springTimer: ReturnType<typeof setTimeout> | undefined;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;

	const root = document.documentElement;

	function reset() {
		clearTimeout(springTimer);
		clearTimeout(settleTimer);
		springTimer = undefined;
		restore = null;
		node.style.transition = '';
		node.style.transform = '';
		node.style.boxShadow = '';
		node.style.background = '';
		node.style.willChange = '';
		root.classList.remove(SWIPING_CLASS);
	}

	function lift() {
		root.classList.add(SWIPING_CLASS);
		node.style.transition = 'none';
		node.style.willChange = 'transform';
		node.style.background = 'var(--bg)';
		node.style.boxShadow = SHADOW;
	}

	/** Animate the page to `x`, then reset it once there. */
	function settleTo(x: number, ms: number) {
		node.style.transition = `transform ${ms}ms ${EASE}`;
		node.style.transform = `translate3d(${x}px,0,0)`;
		springTimer = setTimeout(reset, ms + RESET_SLACK_MS);
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
		if (t.clientX < EDGE_PX || t.clientX > innerWidth - EDGE_PX || !isStandalone()) return;
		links = [...document.querySelectorAll<HTMLAnchorElement>(TAB_LINK)];
		current = links.findIndex((l) => l.getAttribute('aria-current') === 'page');
		if (current < 0 || dialogOpen() || ownsHorizontal(e.target)) return;
		if (!getSelection()?.isCollapsed) return;
		base = 0;
		claimed = false;
		if (springTimer) {
			// The page is still springing back or sliding in: catch it where it is.
			clearTimeout(springTimer);
			springTimer = undefined;
			base = new DOMMatrix(getComputedStyle(node).transform).m41;
			node.style.transition = 'none';
			node.style.transform = `translate3d(${base}px,0,0)`;
			claimed = true;
		}
		startX = t.clientX;
		startY = t.clientY;
		dx = base;
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
			if (Math.abs(mx) < Math.abs(my) * DOMINANCE) {
				stopListening(); // vertical scroll: not ours
				return;
			}
			claimed = true;
			if (!reducedMotion()) lift();
		}
		e.preventDefault();
		const x = base + mx;
		const hasTarget = x < 0 ? current < links.length - 1 : current > 0;
		dx = hasTarget ? x : rubber(x, innerWidth);
		samples.push({ x: t.clientX, t: e.timeStamp });
		if (samples.length > 6) samples.shift();
		if (!reducedMotion() && !raf) raf = requestAnimationFrame(paint);
	}

	function springBack() {
		stopListening();
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
		if (reducedMotion()) return reset();
		settleTo(0, SPRING_MS);
	}

	function oncancel() {
		if (claimed) springBack();
		else stopListening();
	}

	/** The new tab has landed: slide it in from the side opposite to where the old one left. */
	function enterFrom(side: number) {
		clearTimeout(settleTimer);
		restore = null;
		node.style.transition = 'none';
		node.style.transform = `translate3d(${side * innerWidth}px,0,0)`;
		node.getBoundingClientRect(); // commit the start position before transitioning from it
		settleTo(0, SPRING_MS);
	}

	function onend() {
		stopListening();
		if (!claimed) return;
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
		const dir = Math.sign(dx); // -1: page moved left, toward the next tab
		const target = dir ? links[current - dir] : undefined;
		const v = velocity(samples) * dir; // > 0 while still moving away from rest
		const far = Math.abs(dx) > innerWidth * COMMIT_RATIO && v > -FLICK_VELOCITY;
		const flick = v > FLICK_VELOCITY && Math.abs(dx) > FLICK_MIN_PX;
		// A finger that caught a moving page and lifted without dragging only stops it.
		const dragged = Math.abs(samples[samples.length - 1].x - startX) >= LOCK_PX;
		if (!target || !dragged || !(far || flick)) return springBack();

		if (reducedMotion()) {
			reset();
			target.click();
			return;
		}
		// Slide the rest of the way out (no slower than the finger was going), then navigate with
		// the page transition suppressed (the finger already did it) and keep the page off-screen
		// until the new one has landed.
		const rest = innerWidth - Math.abs(dx);
		const ms = Math.round(
			Math.min(SLIDE_OUT_MS, Math.max(SLIDE_OUT_MIN_MS, rest / Math.max(v, 0.01)))
		);
		node.style.transition = `transform ${ms}ms ${EASE}`;
		node.style.transform = `translate3d(${dir * innerWidth}px,0,0)`;
		restore = () => enterFrom(-dir);
		settleTimer = setTimeout(() => {
			skipNextTransition();
			target.click();
			const waitSettle = () => {
				if (!restore) return;
				if (navigating.to) settleTimer = setTimeout(waitSettle, POLL_MS);
				else reset(); // the navigation never landed: put the page back
			};
			settleTimer = setTimeout(waitSettle, SETTLE_MS);
		}, ms);
	}

	node.addEventListener('touchstart', onstart, { passive: true });

	return {
		destroy() {
			node.removeEventListener('touchstart', onstart);
			stopListening();
			reset();
		}
	};
}
