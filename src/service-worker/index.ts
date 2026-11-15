import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self as sw } from '$app/service-worker';

const CACHE = `cache-${version}`;
const ASSETS = new Set(
	[...immutable, ...assets].map(({ path }) => new URL(path, sw.location.origin).pathname)
);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll([...ASSETS]))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin || !ASSETS.has(url.pathname)) return;

	event.respondWith(
		caches.open(CACHE).then(async (cache) => {
			const cached = await cache.match(event.request);
			return cached ?? fetch(event.request);
		})
	);
});
