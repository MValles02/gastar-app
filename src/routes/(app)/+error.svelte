<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import EmptyState from '#lib/components/base/EmptyState.svelte';
	import Header from '#lib/components/base/Header.svelte';

	const notFound = $derived(page.status === 404);
	// Server error() calls use Spanish sentences ending in a period; SvelteKit's English defaults
	// ("Not Found", "Internal Error") have none, so they are never shown.
	const detail = $derived(/\.$/.test(page.error?.message ?? '') ? page.error?.message : null);
</script>

<Header
	title={notFound ? 'No encontrado' : 'Algo salió mal'}
	back={{ href: resolve(''), label: 'Volver al inicio' }}
/>

<EmptyState
	icon="home"
	text={detail ??
		(notFound ? 'No encontramos lo que buscabas.' : 'Ocurrió un error. Probá de nuevo.')}
>
	{#snippet action()}
		<Button href={resolve('')}>Volver a Inicio</Button>
	{/snippet}
</EmptyState>
