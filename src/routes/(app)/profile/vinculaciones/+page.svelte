<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Vinculaciones · Gastar</title>
</svelte:head>

<PageHeader
	title="Vinculaciones"
	back={{ href: resolve('/profile'), label: 'Volver a Perfil', text: 'Perfil' }}
/>

<div class="page">
	{#snippet mpState()}<span class="val"
			>{data.mp === 'linked'
				? 'Vinculado'
				: data.mp === 'reconnect'
					? 'Reconectar'
					: 'Vincular'}</span
		>{/snippet}

	<ListCard aria-label="Vinculaciones">
		<ListRow
			href={resolve('/profile/mercado-pago')}
			lead={{ icon: 'phone', color: null }}
			title="Mercado Pago"
			value={mpState}
			chevron
		/>
	</ListCard>

	<p class="hint">
		Traé tus movimientos sin tipearlos. Lo que reconocemos se aprueba solo; el resto lo revisás vos.
	</p>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.val {
		min-width: 0;
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-muted);
		font-weight: 400;
	}

	.hint {
		padding-inline: var(--space-4);
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}
</style>
