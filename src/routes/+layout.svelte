<script lang="ts">
	import '@fontsource/dm-sans/400.css';
	import '@fontsource/dm-sans/500.css';
	import '@fontsource/dm-sans/600.css';
	import '@fontsource/newsreader/latin-500.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { children } = $props();

	// Keeps toasts above the floating tab bar.
	const toastOffset = { bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' };
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<Toaster
	position="bottom-center"
	duration={4000}
	containerAriaLabel="Notificaciones"
	offset={toastOffset}
	mobileOffset={toastOffset}
/>
