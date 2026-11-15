import { getRequestEvent } from '$app/server';

/** The current request's event; throws outside a request. The only reader of `getRequestEvent`. */
export const requestEvent = getRequestEvent;

const requestMemo = new WeakMap<object, Map<string, Promise<unknown>>>();

/**
 * Wraps `run` so its promise is shared between the loads of one request (keyed on `locals`, then on
 * `name` and the arguments). For loads only: a form action must not cache data it is about to mutate.
 * Needs a request: `requestEvent` throws outside one.
 */
export function memoPerRequest<A extends string[], T>(
	name: string,
	run: (...args: A) => Promise<T>
): (...args: A) => Promise<T> {
	return (...args) => {
		const { locals } = requestEvent();
		let memo = requestMemo.get(locals);
		if (!memo) requestMemo.set(locals, (memo = new Map()));
		const key = [name, ...args].join(':');
		let hit = memo.get(key);
		if (!hit) memo.set(key, (hit = run(...args)));
		return hit as Promise<T>;
	};
}
