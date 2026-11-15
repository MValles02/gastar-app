<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import Icon from '#lib/components/Icon.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';

	const notFound = $derived(page.status === 404);
	// Server error() calls use Spanish sentences ending in a period; SvelteKit's English defaults
	// ("Not Found", "Internal Error") have none, so they are never shown.
	const detail = $derived(/\.$/.test(page.error?.message ?? '') ? page.error?.message : null);
</script>

<PageHeader
	title={notFound ? 'No encontrado' : 'Algo salió mal'}
	back={{ href: resolve(''), label: 'Volver al inicio', text: 'Inicio' }}
/>

<Empty.Root>
	<Empty.Header>
		<Empty.Media variant="icon"><Icon name="home" size="1rem" /></Empty.Media>
		<Empty.Description
			>{detail ??
				(notFound
					? 'No encontramos lo que buscabas.'
					: 'Ocurrió un error. Probá de nuevo.')}</Empty.Description
		>
	</Empty.Header>
</Empty.Root>

<Button href={resolve('')}>Volver a Inicio</Button>
