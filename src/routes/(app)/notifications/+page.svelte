<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Avisos · Gastar</title>
</svelte:head>

<PageHeader
	title="Avisos"
	back={{ href: resolve('/'), label: 'Volver al inicio', text: 'Inicio' }}
/>

<div class="page">
	{#if data.items.length === 0}
		<EmptyState
			icon="bell"
			description="Estás al día. Acá vas a ver los límites o el plan cuando vayan rápido o se pasen."
		/>
	{:else}
		<ListCard>
			{#each data.items as n (n.id)}
				{#snippet message()}{n.message}{/snippet}
				{#snippet statusPill()}
					<StatusPill tone={n.status.tone} label={n.status.label} />
				{/snippet}
				<ListRow
					href={n.href}
					lead={n.kind === 'plan'
						? { icon: 'plan', color: null }
						: n.icon
							? { icon: n.icon, color: n.color }
							: { letter: n.name.charAt(0).toUpperCase(), color: n.color }}
					title={n.name}
					value={statusPill}
					meta={message}
				/>
			{/each}
		</ListCard>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.page :global([data-slot='item']) {
		min-height: 3.75rem;
	}
</style>
