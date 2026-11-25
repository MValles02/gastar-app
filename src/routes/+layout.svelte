<script lang="ts">
	import '@fontsource-variable/geist-mono';
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { drawers } from '#lib/drawer-open.svelte.ts';
	import { track, transitionOf } from '#lib/nav-stack.svelte.ts';
	import { tabSlideOut } from '#lib/tab-swipe.ts';
	import { FORM_ROUTES, TAB_ROUTES } from '#lib/form-routes.ts';
	import favicon from '#lib/assets/favicon.svg';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import NavProgress from '#lib/components/NavProgress.svelte';

	let { children } = $props();

	// Hydration marker: the root layout mounts after every child, so the page is interactive once it is
	// set. E2E waits for it (`waitForHydration` in e2e/helpers.ts) before using a JS-only control.
	onMount(() => {
		document.documentElement.dataset.hydrated = '';
	});

	// Mirrors the history stack so back/close/save can pop instead of pushing the parent again.
	afterNavigate(track);

	// The last popstate was already animated by the browser (iOS swipe-back): don't animate it twice.
	let uaAnimatedPop = false;
	const onpopstate = (e: PopStateEvent) =>
		(uaAnimatedPop =
			(e as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition === true);

	// Page transitions (View Transitions API): the direction goes on <html> for the CSS in app.css.
	onNavigate((nav) => {
		// A shallow goto (drawer open) is no page change; closing the drawer (shallow popstate) fires no
		// hook as long as `page.url` matches the address bar, which `stripFlags` guarantees.
		if (nav.shallow && nav.type === 'goto') return;
		const kind = transitionOf(nav);
		// A tab swipe navigates at release: hold the content swap until its slide-out has ended.
		const slide = tabSlideOut();
		if (slide) return slide;
		if (
			!kind ||
			!document.startViewTransition ||
			(nav.type === 'popstate' && uaAnimatedPop) ||
			matchMedia('(prefers-reduced-motion: reduce)').matches
		)
			return;
		document.documentElement.dataset.navTransition = kind;
		return new Promise<void>((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await nav.complete.catch(() => {});
			});
		});
	});

	// Toasts sit above the floating tab bar only on tab routes; form routes have a sticky submit bar
	// plus Cancelar at the bottom, so they show below the compact header instead.
	// While a bottom drawer is open they also go to the top (the drawer's actions sit at the bottom).
	const onTop = $derived(FORM_ROUTES.has(page.route.id ?? '') || drawers.open > 0);
	const toastOffset = $derived(
		onTop
			? { top: 'calc(4.5rem + env(safe-area-inset-top))' }
			: TAB_ROUTES.has(page.route.id ?? '')
				? { bottom: 'var(--tabbar-clearance)' }
				: { bottom: 'calc(var(--space-5) + env(safe-area-inset-bottom))' }
	);
</script>

<svelte:window {onpopstate} />

<!-- iOS Safari only applies :active (pressed rows and buttons) when the page listens to touches. -->
<svelte:document ontouchstart={() => {}} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<NavProgress />

{@render children()}

<Toaster
	position={onTop ? 'top-center' : 'bottom-center'}
	duration={4000}
	containerAriaLabel="Notificaciones"
	offset={toastOffset}
	mobileOffset={toastOffset}
/>

<style>
	/* The modal drawer turns the page behind it pointer-events: none, toasts included: keep Deshacer clickable. */
	:global([data-sonner-toast]) {
		pointer-events: auto;
	}
</style>
