import { refreshAll } from '$app/navigation';
import { toast } from 'svelte-sonner';
import {
	DOMINANCE,
	LOCK_PX,
	RESET_SLACK_MS,
	SPRING,
	SPRING_MS,
	dialogOpen,
	isIOSStandalone,
	ownsHorizontal,
	reducedMotion,
	rubber,
	unrubber
} from '#lib/swipe.ts';

/**
 * Pull-to-refresh for the installed iOS app, which (unlike Android's installed app and every
 * browser tab) has no native one. On a tab screen scrolled to the top, a downward drag (vertical
 * travel at least DOMINANCE x the horizontal) moves the
 * page content down with rubber-band resistance while the header stays put, uncovering an
 * indicator (`PullIndicator`) below it (on Home, which has its own emerald backdrop above the
 * band, just below the top safe area). Releasing past THRESHOLD_PX runs `refreshAll()`, holds
 * the content at HOLD_PX with the indicator spinning until it resolves, then settles back; below
 * the threshold the content springs back. Only the screen's `<header>` stays put.
 *
 * Tab screens only: they are the overview screens whose data goes stale; child screens are
 * details and forms, where a reload could clobber input in progress and the edge-swipe back
 * already owns the gesture space. Never while a drawer or dialog is open, from an input, slider,
 * text selection, or inside a scroller of its own. On iOS standalone the root's
 * `overscroll-behavior-y` is set to none while mounted (the native bounce would double ours); on
 * Android and in browser tabs it is left alone (Android's native pull-to-refresh needs it). At the
 * top a downward move is also `preventDefault`ed while the gesture may still be ours.
 */
const THRESHOLD_PX = 72;
const HOLD_PX = 56;
/** The indicator's size: it starts sliding down once the gap is wider than it. */
const INDICATOR_PX = 32;
/** A refresh that resolves faster still shows the spinner this long, so it does not flash. */
const MIN_SPIN_MS = 400;
const INDICATOR = '[data-pull-indicator]';
const ARROW = '[data-pull-arrow]';
const STATUS = '[data-pull-status]';
const CURRENT_TAB = '[data-tab-link][aria-current="page"]';
const ANCHORS = ':scope > header';

/** True when the touch starts inside an element that scrolls vertically on its own. */
function ownsVertical(target: EventTarget | null) {
	for (let el = target as Element | null; el && el !== document.body; el = el.parentElement) {
		if (el.scrollHeight > el.clientHeight) {
			const oy = getComputedStyle(el).overflowY;
			if (oy === 'auto' || oy === 'scroll') return true;
		}
	}
	return false;
}

export function pullRefresh(node: HTMLElement) {
	let startX = 0;
	let startY = 0;
	/** Finger travel already behind a page caught mid-spring. */
	let base = 0;
	let dy = 0;
	/** pending: touching at the top, not yet decided; pulling: claimed. */
	let state: 'idle' | 'pending' | 'pulling' | 'refreshing' = 'idle';
	let raf = 0;
	let springTimer: ReturnType<typeof setTimeout> | undefined;
	let anchors: HTMLElement[] = [];
	let indicator: HTMLElement | null = null;
	let arrow: HTMLElement | null = null;

	const range = () => innerHeight;

	function move(y: number, transition: string) {
		node.style.transition = transition;
		node.style.transform = `translate3d(0,${y}px,0)`;
		for (const a of anchors) {
			a.style.transition = transition;
			a.style.transform = `translate3d(0,${-y}px,0)`;
		}
		if (!indicator) return;
		indicator.style.transition = transition && `${transition}, opacity ${SPRING}`;
		indicator.style.transform = `translate3d(0,${Math.max(0, (y - INDICATOR_PX) / 2)}px,0)`;
	}

	function paintIndicator(y: number) {
		if (!indicator || !arrow) return;
		const p = Math.min(1, y / THRESHOLD_PX);
		indicator.dataset.state = y >= THRESHOLD_PX ? 'armed' : 'pulling';
		indicator.style.opacity = String(p);
		if (!reducedMotion()) arrow.style.transform = `rotate(${p * 180}deg)`;
	}

	function reset() {
		clearTimeout(springTimer);
		springTimer = undefined;
		for (const el of [node, ...anchors]) {
			el.style.transition = '';
			el.style.transform = '';
			el.style.willChange = '';
		}
		if (indicator) {
			indicator.style.transition = '';
			indicator.style.transform = '';
			indicator.style.opacity = '';
			indicator.dataset.state = 'idle';
		}
		if (arrow) arrow.style.transform = '';
		anchors = [];
		state = 'idle';
	}

	function stopListening() {
		removeEventListener('touchmove', onmove);
		removeEventListener('touchend', onend);
		removeEventListener('touchcancel', oncancel);
	}

	/** Settle back to rest on the shared curve, then clear every inline style. */
	function settle() {
		state = 'idle';
		if (reducedMotion()) return reset();
		move(0, `transform ${SPRING}`);
		if (indicator) indicator.style.opacity = '0';
		springTimer = setTimeout(reset, SPRING_MS + RESET_SLACK_MS);
	}

	function onstart(e: TouchEvent) {
		if (e.touches.length !== 1 || state !== 'idle' || !isIOSStandalone()) return;
		if (scrollY > 0 || !document.querySelector(CURRENT_TAB) || dialogOpen()) return;
		if (ownsHorizontal(e.target) || ownsVertical(e.target)) return;
		if (!getSelection()?.isCollapsed) return;
		const caught = !!springTimer;
		// Another gesture still owns the page (it is still moved).
		if (!caught && node.style.transform) return;
		base = 0;
		state = 'pending';
		if (caught) {
			// Our own spring back is still running: catch the content where it is.
			clearTimeout(springTimer);
			springTimer = undefined;
			const y = new DOMMatrix(getComputedStyle(node).transform).m42;
			move(y, 'none');
			base = unrubber(Math.min(y, range() - 1), range());
			state = 'pulling';
		}
		const t = e.touches[0];
		startX = t.clientX;
		startY = t.clientY;
		dy = 0;
		// Not passive: at the top, a downward move must not start iOS's own bounce.
		addEventListener('touchmove', onmove, { passive: false });
		addEventListener('touchend', onend, { passive: true });
		addEventListener('touchcancel', oncancel, { passive: true });
	}

	function lift() {
		anchors = [...node.querySelectorAll<HTMLElement>(ANCHORS)];
		indicator = document.querySelector<HTMLElement>(INDICATOR);
		arrow = indicator?.querySelector<HTMLElement>(ARROW) ?? null;
		const bottom = Math.max(0, ...anchors.map((a) => a.getBoundingClientRect().bottom));
		if (indicator) {
			indicator.style.top = anchors.length ? `${bottom}px` : 'calc(env(safe-area-inset-top) + 8px)';
		}
		if (reducedMotion()) return;
		for (const el of [node, ...anchors]) el.style.willChange = 'transform';
		move(0, 'none');
	}

	function paint() {
		raf = 0;
		if (!reducedMotion()) move(dy, 'none');
		paintIndicator(dy);
	}

	/** The touch is not a pull after all: let it go. */
	function release() {
		stopListening();
		state = 'idle';
	}

	function onmove(e: TouchEvent) {
		const t = e.touches[0];
		const mx = t.clientX - startX;
		const my = t.clientY - startY;
		if (state === 'pending') {
			if (my <= 0 || scrollY > 0) return release(); // scrolling the content: not ours
			e.preventDefault();
			if (Math.hypot(mx, my) < LOCK_PX) return;
			if (my < Math.abs(mx) * DOMINANCE) return release(); // sideways: not ours
			state = 'pulling';
			lift();
		}
		e.preventDefault();
		dy = rubber(Math.max(0, base + my), range());
		if (!raf) raf = requestAnimationFrame(paint);
	}

	function oncancel() {
		if (state === 'pulling') {
			stopListening();
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
			settle();
		} else release();
	}

	function onend() {
		stopListening();
		if (state !== 'pulling') {
			state = 'idle';
			return;
		}
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
		if (dy >= THRESHOLD_PX) void refresh();
		else settle();
	}

	async function refresh() {
		state = 'refreshing';
		const status = document.querySelector(STATUS);
		if (indicator) {
			indicator.dataset.state = 'refreshing';
			indicator.style.opacity = '1';
		}
		if (arrow) arrow.style.transform = '';
		if (!reducedMotion()) move(HOLD_PX, `transform ${SPRING}`);
		if (status) status.textContent = 'Actualizando…';
		const started = performance.now();
		let ok = true;
		try {
			await refreshAll();
		} catch (err) {
			ok = false;
			console.error('pull-to-refresh failed', err);
			toast.error('No se pudo actualizar.');
		}
		const left = MIN_SPIN_MS - (performance.now() - started);
		if (left > 0) await new Promise((r) => setTimeout(r, left));
		if (status) status.textContent = ok ? 'Actualizado' : '';
		settle();
	}

	node.addEventListener('touchstart', onstart, { passive: true });
	const rootStyle = document.documentElement.style;
	const prevOverscroll = rootStyle.overscrollBehaviorY;
	const ios = isIOSStandalone();
	if (ios) rootStyle.overscrollBehaviorY = 'none';

	return {
		destroy() {
			if (ios) rootStyle.overscrollBehaviorY = prevOverscroll;
			node.removeEventListener('touchstart', onstart);
			stopListening();
			if (raf) cancelAnimationFrame(raf);
			reset();
		}
	};
}
