import { error } from '@sveltejs/kit';
import type { OAuthLink } from '#lib/server/imports/oauth-link.ts';

type Handler = (event: never) => unknown;

/** `handler` behind the link's feature switch: 404 while the link is not configured. */
export function whenLinkEnabled<H extends Handler>(link: OAuthLink, handler: H): H {
	return ((event: never) => {
		if (!link.enabled()) error(404);
		return handler(event);
	}) as H;
}

/** Every action of a link page behind the feature switch, so a new action cannot skip it. */
export function linkActions<A extends Record<string, Handler>>(link: OAuthLink, actions: A): A {
	return Object.fromEntries(
		Object.entries(actions).map(([name, action]) => [name, whenLinkEnabled(link, action)])
	) as A;
}
