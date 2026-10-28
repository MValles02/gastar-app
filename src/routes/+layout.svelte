<script lang="ts">
	import '@fontsource-variable/geist-mono';
	import '../app.css';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { track } from '$lib/nav-stack.svelte';
	import { FORM_ROUTES, TAB_ROUTES } from '$lib/form-routes';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { children } = $props();

	// Mirrors the history stack so back/close/save can pop instead of pushing the parent again.
	afterNavigate(track);

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
