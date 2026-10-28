/* eslint-disable svelte/prefer-svelte-reactivity -- URLs here are parsed and compared, never mutated or rendered */
import { goto } from '$app/navigation';
import type { ActionResult, AfterNavigate } from '@sveltejs/kit';

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
/** Runs once the `history.go` started by `navigateUp` has landed. */
let afterPop: (() => unknown) | null = null;
/** A `history.go` from `navigateUp` has not landed yet: `index` is stale, so further ups are ignored. */
let popping = false;

const keyOf = (url: URL) => url.pathname + url.search;
const pathOf = (key: string) => key.split('?')[0];

/** Called from the root layout's `afterNavigate`. */
export function track(nav: AfterNavigate) {
	const url = nav.to?.url;
	if (!url) return;
	const key = keyOf(url);
	const replaced = replaceNext;
	replaceNext = false;

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
		popping = false;
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

/**
 * Goes "up" to `href`: pops back to it when it is on the stack (the exact URL first, else the same
 * pathname on another page). Otherwise it first pops the run of entries on the current screen (wizard
 * steps) back to its first entry and replaces that, or replaces the current entry when there is none. The
 * popstate navigation reruns the loads; when `href` carries a query (e.g. a `?planSaved=1` flag) the
 * popped entry is replaced with it so the flag still reaches the page. Ignored while a pop is in flight.
 */
export async function navigateUp(href: string) {
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
		if (target.search && landed !== key) afterPop = () => replaceGoto(key, { invalidateAll: true });
		pop(to);
		return;
	}
	let first = index;
	if (target.pathname !== location.pathname)
		while (first > 0 && pathOf(entries[first - 1]) === location.pathname) first--;
	if (first === index) {
		await replaceGoto(key, { invalidateAll: true });
		return;
	}
	// Pop back to the first entry of the current screen's run (e.g. wizard step 1), then replace it.
	afterPop = () => replaceGoto(key, { invalidateAll: true });
	pop(first);
}

function pop(to: number) {
	popping = true;
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
	return navigateUp(result.location);
}

/** Drop-in for bare `use:enhance`: `use:enhance={() => enhanceRedirect}`. */
export const enhanceRedirect = (input: EnhanceResult) => followRedirect(input);
