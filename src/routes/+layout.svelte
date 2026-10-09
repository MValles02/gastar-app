<script lang="ts">
	import '@fontsource/dm-sans/400.css';
	import '@fontsource/dm-sans/500.css';
	import '@fontsource/dm-sans/600.css';
	import '@fontsource/newsreader/latin-500.css';
	import '../app.css';
	import { page } from '$app/state';
	import { FORM_ROUTES } from '$lib/form-routes';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { children } = $props();

	// Toasts sit above the floating tab bar; form routes have no tab bar and a sticky submit bar
	// plus Cancelar at the bottom, so they show below the compact header instead.
	const isForm = $derived(FORM_ROUTES.has(page.route.id ?? ''));
	const toastOffset = $derived(
		isForm
			? { top: 'calc(4.5rem + env(safe-area-inset-top))' }
			: { bottom: 'var(--tabbar-clearance)' }
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
