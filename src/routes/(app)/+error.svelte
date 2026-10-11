<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	const notFound = $derived(page.status === 404);
	// Server error() calls use Spanish sentences ending in a period; SvelteKit's English defaults
	// ("Not Found", "Internal Error") have none, so they are never shown.
	const detail = $derived(/\.$/.test(page.error?.message ?? '') ? page.error?.message : null);
</script>

<PageHeader
	title={notFound ? 'No encontrado' : 'Algo salió mal'}
	back={{ href: resolve('/'), label: 'Volver al inicio' }}
/>

<EmptyState icon="home">
	{detail ?? (notFound ? 'No encontramos lo que buscabas.' : 'Ocurrió un error. Probá de nuevo.')}
</EmptyState>

<Button href={resolve('/')}>Volver a Inicio</Button>
