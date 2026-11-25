import type { ActionResult } from '$app/forms';
/* eslint-disable svelte/prefer-svelte-reactivity -- URLs here are parsed and compared, never mutated or rendered */
import { goto, refreshAll, type AfterNavigate, type OnNavigate } from '$app/navigation';
import { isModifiedClick } from '#lib/open-shallow.ts';
import { TOAST_FLAGS } from '#lib/toast-flags.ts';

/**
 * In-memory mirror of this tab's history entries inside the app (pathname + search), so "up"
 * (back ‹, close ✕, Cancelar, a form save) can pop back to the parent like a native stack instead
 * of pushing it again. Only entries seen since the last full load are known: after a reload the
 * stack holds just the current page and "up" falls back to replacing the current entry.
 */
let entries: string[] = [];
let index = -1;
/** One-shot: the next tracked navigation replaced the current entry instead of pushing one. */
let replaceNext = false;
/** One-shot: how the next tracked navigation animates when it is not a plain push or pop. */
let transitionNext: 'back' | 'none' | null = null;
/** One-shot: the next navigation was already animated by a gesture (edge swipe), so it gets no transition. */
let skipTransition = false;
let skipTimer: ReturnType<typeof setTimeout> | undefined;
/** Runs once the `history.go` started by `navigateUp` has landed. */
let afterPop: (() => unknown) | null = null;
/** A `history.go` from `navigateUp` has not landed yet: `index` is stale, so further ups are ignored. */
let popping = false;
let poppingTimer: ReturnType<typeof setTimeout> | undefined;
/** No `popstate` by then means the traversal never started: stop blocking the up controls. */
const POP_TIMEOUT_MS = 1000;

/** The bottom-nav tabs in bar order (TabBar.svelte): a tab switch slides toward the target's side. */
const TAB_PATHS = ['/', '/movements', '/plan', '/reports'];

const keyOf = (url: URL) => url.pathname + url.search;
const pathOf = (key: string) => key.split('?')[0];

/** Called from the root layout's `afterNavigate`. */
export function track(nav: AfterNavigate) {
	// A shallow `goto` (drawer open, flag strip) is not a history entry the stack tracks.
	if (nav.shallow && nav.type === 'goto') return;
	const url = nav.to?.url;
	if (!url) return;
	const key = keyOf(url);
	const replaced = replaceNext;
	replaceNext = false;
	transitionNext = null;
	// Any landed navigation ends a pop in flight (a superseding one too, which drops its follow-up).
	popping = false;
	clearTimeout(poppingTimer);
	if (nav.type !== 'popstate') afterPop = null;

	if (nav.type === 'enter' || index < 0) {
		entries = [key];
		index = 0;
	} else if (nav.type === 'popstate') {
		const i = index + (nav.delta ?? 0);
		if (i >= 0 && i < entries.length && pathOf(entries[i]) === url.pathname) {
			index = i;
			entries[i] = key;
		} else {
			// Moved outside what we know (e.g. back past the page loaded first): start over.
			entries = [key];
			index = 0;
		}
		const done = afterPop;
		afterPop = null;
		if (done) void Promise.resolve().then(done);
	} else if (replaced) {
		entries[index] = key;
	} else {
		entries = entries.slice(0, index + 1);
		entries.push(key);
		index = entries.length - 1;
	}
}

/** Marks the next navigation as a replace (for links with `data-sveltekit-replacestate`). */
export function markReplace(e?: MouseEvent) {
	if (e && isModifiedClick(e)) return;
	replaceNext = true;
}

/** `goto` that overwrites the current history entry (tabs, filters, month, currency). */
export function replaceGoto(href: string, opts: Parameters<typeof goto>[1] = {}) {
	replaceNext = true;
	// eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass resolved same-origin paths
	return goto(href, { ...opts, replace: true });
}

/**
 * Strips one-shot query flags (default: the toast flags a save leaves) from the current URL with a
 * replace navigation and keeps the stack's copy in sync, so a later "up" to this screen still sees the
 * flag missing and replaces the entry with it. It is not shallow on purpose: a shallow goto leaves
 * `page.url` (and the history entry's `pageUrl`) with the flag, so closing a drawer opened after it
 * would be a full popstate navigation to the flagged URL and rerun the flag's effect. Deferred to a
 * task so it runs after every `afterNavigate` callback, `track` included (their order is not fixed).
 * Resolves once stripped (or the strip failed), so a caller can push shallow state right after (the
 * navigation wipes `page.state`).
 */
export async function stripFlags(names: readonly string[] = TOAST_FLAGS) {
	await new Promise((r) => setTimeout(r));
	const url = new URL(location.href);
	if (!names.some((n) => url.searchParams.has(n))) return;
	for (const n of names) url.searchParams.delete(n);
	await replaceGoto(url.pathname + url.search + url.hash, { reset: false }).catch(() => {
		replaceNext = false;
	});
}

/**
 * Goes "up" to `href`: pops back to it when it is on the stack (the exact URL first, else the same
 * pathname on another page). Otherwise it first pops the run of entries on the current screen (wizard
 * steps) back to its first entry and replaces that, or replaces the current entry when there is none. The
 * popstate navigation reruns the loads; when `href` carries a query (e.g. a `?planSaved=1` flag) the
 * popped entry is replaced with it so the flag still reaches the page. Ignored while a pop is in flight.
 * `refresh` (after a save) also invalidates once the pop lands: a popstate reuses loads that only read
 * `locals`, such as the (app) layout's header initials and alert count.
 */
export async function navigateUp(href: string, { refresh = false } = {}) {
	if (popping) return;
	const target = new URL(href, location.href);
	if (target.origin !== location.origin) {
		location.assign(target);
		return;
	}
	const key = keyOf(target);
	let to = -1;
	for (let i = index - 1; i >= 0 && to < 0; i--) if (entries[i] === key) to = i;
	if (to < 0 && target.pathname !== location.pathname)
		for (let i = index - 1; i >= 0 && to < 0; i--)
			if (pathOf(entries[i]) === target.pathname) to = i;

	if (to >= 0) {
		const landed = entries[to];
		if (target.search && landed !== key) afterPop = () => replaceAfterPop(key);
		else if (refresh) afterPop = refreshAll;
		pop(to);
		return;
	}
	let first = index;
	if (target.pathname !== location.pathname)
		while (first > 0 && pathOf(entries[first - 1]) === location.pathname) first--;
	if (first === index) {
		transitionNext = 'back';
		await replaceGoto(key, { refreshAll: true });
		return;
	}
	// Pop back to the first entry of the current screen's run (e.g. wizard step 1), then replace it.
	afterPop = () => replaceAfterPop(key);
	pop(first);
}

/** The replace that follows a pop: the pop already animated, so this one does not. */
function replaceAfterPop(key: string) {
	transitionNext = 'none';
	return replaceGoto(key, { refreshAll: true });
}

/**
 * Page transition for a navigation, read once in the root layout's `onNavigate` (it consumes
 * `transitionNext`, so a replace that never lands can't leak it into the next navigation): a push
 * slides forward, a pop (‹, browser/iOS back) or an "up" replace slides back, a tab switch slides
 * toward the tab's side of the bar (`tab-right`/`tab-left`), and any other replace to another screen
 * crossfades. The tab bar only shows on the tab screens, so a child screen reaches a tab through its
 * back/up control, which slides back. A change within one screen (month, currency, filters, search,
 * wizard step) gets none: taps are swallowed while a transition runs.
 */
export function transitionOf(
	nav: OnNavigate
): 'forward' | 'back' | 'tab-right' | 'tab-left' | 'fade' | null {
	if (skipTransition) {
		skipTransition = false;
		transitionNext = null;
		return null;
	}
	const next = transitionNext;
	transitionNext = null;
	if (next) return next === 'none' ? null : next;
	if (nav.from?.url.pathname === nav.to?.url.pathname) return null;
	if (replaceNext) {
		const from = TAB_PATHS.indexOf(nav.from?.url.pathname ?? '');
		const to = TAB_PATHS.indexOf(nav.to?.url.pathname ?? '');
		if (from < 0 || to < 0) return 'fade';
		return to > from ? 'tab-right' : 'tab-left';
	}
	if (nav.type === 'popstate') return (nav.delta ?? 0) < 0 ? 'back' : 'forward';
	return 'forward';
}

/** The next navigation gets no page transition (a drag already moved the page); expires if none starts. */
export function skipNextTransition() {
	skipTransition = true;
	clearTimeout(skipTimer);
	skipTimer = setTimeout(() => (skipTransition = false), POP_TIMEOUT_MS);
}

function pop(to: number) {
	popping = true;
	clearTimeout(poppingTimer);
	// Once popstate fires the load is under way: `track` clears `popping` when it lands, however slow.
	const arrived = () => clearTimeout(poppingTimer);
	addEventListener('popstate', arrived, { once: true });
	poppingTimer = setTimeout(() => {
		removeEventListener('popstate', arrived);
		popping = false;
		afterPop = null;
	}, POP_TIMEOUT_MS);
	history.go(to - index);
}

/** `onclick` for an "up" link that keeps its `href` (no-JS, new tab) but pops when it can. */
export const upOnClick = (href: string) => (e: MouseEvent) => {
	if (isModifiedClick(e)) return;
	e.preventDefault();
	void navigateUp(href);
};

type EnhanceResult = {
	result: ActionResult;
	update: (opts?: { reset?: boolean; refreshAll?: boolean }) => Promise<void>;
};

/**
 * Form `enhance` result handler: a redirect to another screen goes "up" (pops), a redirect within the
 * same screen (next wizard step, `?saved=1`) pushes as before, anything else is `update(opts)`.
 */
export async function followRedirect(
	{ result, update }: EnhanceResult,
	opts?: { reset?: boolean }
) {
	if (result.type !== 'redirect') return update(opts);
	const target = new URL(result.location, location.href);
	if (target.origin === location.origin && target.pathname === location.pathname)
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- server-validated same-origin redirect location
		return goto(keyOf(target), { refreshAll: true });
	return navigateUp(result.location, { refresh: true });
}
