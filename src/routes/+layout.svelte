<script lang="ts">
	import '@fontsource-variable/geist-mono';
	import '../app.css';
	import { afterNavigate, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { track, transitionOf } from '$lib/nav-stack.svelte';
	import { FORM_ROUTES, TAB_ROUTES } from '$lib/form-routes';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { children } = $props();

	// Mirrors the history stack so back/close/save can pop instead of pushing the parent again.
	afterNavigate(track);

	// The last popstate was already animated by the browser (iOS swipe-back): don't animate it twice.
	let uaAnimatedPop = false;
	const onpopstate = (e: PopStateEvent) =>
		(uaAnimatedPop =
			(e as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition === true);

	// Page transitions (View Transitions API): the direction goes on <html> for the CSS in app.css.
	onNavigate((nav) => {
		const kind = transitionOf(nav);
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
	const isForm = $derived(FORM_ROUTES.has(page.route.id ?? ''));
	const toastOffset = $derived(
		isForm
			? { top: 'calc(4.5rem + env(safe-area-inset-top))' }
			: TAB_ROUTES.has(page.route.id ?? '')
				? { bottom: 'var(--tabbar-clearance)' }
				: { bottom: 'calc(var(--space-5) + env(safe-area-inset-bottom))' }
	);
</script>

<svelte:window {onpopstate} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<Toaster
	position={isForm ? 'top-center' : 'bottom-center'}
	duration={4000}
	containerAriaLabel="Notificaciones"
	offset={toastOffset}
	mobileOffset={toastOffset}
/>
