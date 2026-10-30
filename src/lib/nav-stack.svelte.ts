/* eslint-disable svelte/prefer-svelte-reactivity -- URLs here are parsed and compared, never mutated or rendered */
import { goto, invalidateAll } from '$app/navigation';
import type { ActionResult, AfterNavigate, OnNavigate } from '@sveltejs/kit';
import { FORM_ROUTES } from '$lib/form-routes';

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
/** Runs once the `history.go` started by `navigateUp` has landed. */
let afterPop: (() => unknown) | null = null;
/** A `history.go` from `navigateUp` has not landed yet: `index` is stale, so further ups are ignored. */
let popping = false;
let poppingTimer: ReturnType<typeof setTimeout> | undefined;
/** No `popstate` by then means the traversal never started: stop blocking the up controls. */
const POP_TIMEOUT_MS = 1000;

const keyOf = (url: URL) => url.pathname + url.search;
const pathOf = (key: string) => key.split('?')[0];

/** Called from the root layout's `afterNavigate`. */
export function track(nav: AfterNavigate) {
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
	if (e && isModified(e)) return;
	replaceNext = true;
}

/** `goto` that overwrites the current history entry (tabs, filters, month, currency). */
export function replaceGoto(href: string, opts: Parameters<typeof goto>[1] = {}) {
	replaceNext = true;
	// eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass resolved same-origin paths
	return goto(href, { ...opts, replaceState: true });
}

/** A pop started by `navigateUp` has not landed yet. */
export const isPopping = () => popping;

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
		else if (refresh) afterPop = invalidateAll;
		pop(to);
		return;
	}
	let first = index;
	if (target.pathname !== location.pathname)
		while (first > 0 && pathOf(entries[first - 1]) === location.pathname) first--;
	if (first === index) {
		transitionNext = 'back';
		await replaceGoto(key, { invalidateAll: true });
		return;
	}
	// Pop back to the first entry of the current screen's run (e.g. wizard step 1), then replace it.
	afterPop = () => replaceAfterPop(key);
	pop(first);
}

/** The replace that follows a pop: the pop already animated, so this one does not. */
function replaceAfterPop(key: string) {
	transitionNext = 'none';
	return replaceGoto(key, { invalidateAll: true });
}

/**
 * Page transition for a navigation, read once in the root layout's `onNavigate` (it consumes
 * `transitionNext`, so a replace that never lands can't leak it into the next navigation): a push
 * slides forward, a pop (‹, browser/iOS back) or an "up" replace slides back, and a tab switch (a
 * replace to another screen) crossfades. A change within one screen (month, currency, filters,
 * search, wizard step) gets none: taps are swallowed while a transition runs. A slide into a form
 * screen from a non-form one raises it as a sheet ('sheet-up'); one out of it lowers it ('sheet-down').
 */
export function transitionOf(nav: OnNavigate): NavTransition | null {
	const kind = slideOf(nav);
	if (kind !== 'forward' && kind !== 'back') return kind;
	const fromSheet = FORM_ROUTES.has(nav.from?.route.id ?? '');
	const toSheet = FORM_ROUTES.has(nav.to?.route.id ?? '');
	if (toSheet && !fromSheet) return 'sheet-up';
	if (fromSheet && !toSheet) return 'sheet-down';
	return kind;
}

export type NavTransition = 'forward' | 'back' | 'fade' | 'sheet-up' | 'sheet-down';

function slideOf(nav: OnNavigate): 'forward' | 'back' | 'fade' | null {
	const next = transitionNext;
	transitionNext = null;
	if (next) return next === 'none' ? null : next;
	if (nav.from?.url.pathname === nav.to?.url.pathname) return null;
	if (replaceNext) return 'fade';
	if (nav.type === 'popstate') return (nav.delta ?? 0) < 0 ? 'back' : 'forward';
	return 'forward';
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

function isModified(e: MouseEvent) {
	return e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
}

/** `onclick` for an "up" link that keeps its `href` (no-JS, new tab) but pops when it can. */
export const upOnClick = (href: string) => (e: MouseEvent) => {
	if (isModified(e)) return;
	e.preventDefault();
	void navigateUp(href);
};

type EnhanceResult = {
	result: ActionResult;
	update: (opts?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>;
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
		return goto(keyOf(target), { invalidateAll: true });
	return navigateUp(result.location, { refresh: true });
}

/** Drop-in for bare `use:enhance`: `use:enhance={() => enhanceRedirect}`. */
export const enhanceRedirect = (input: EnhanceResult) => followRedirect(input);
