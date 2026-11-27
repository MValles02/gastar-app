<script lang="ts">
	import Group from '#lib/components/base/Group.svelte';
	import Row from '#lib/components/base/Row.svelte';
	import EmptyState from '#lib/components/base/EmptyState.svelte';
	import Header from '#lib/components/base/Header.svelte';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Avisos · Gastar</title>
</svelte:head>

<Header title="Avisos" back={{ href: resolve(''), label: 'Volver al inicio' }} />

<div class="page">
	{#if data.items.length === 0}
		<EmptyState
			icon="bell"
			text="Estás al día. Acá vas a ver los límites o el plan cuando vayan rápido o se pasen."
		/>
	{:else}
		<Group>
			{#each data.items as n (n.id)}
				{#snippet message()}<p class="message">{n.message}</p>{/snippet}
				<Row
					href={n.href}
					glyph={n.kind === 'plan'
						? { icon: 'plan', tone: 'neutral' }
						: { category: { icon: n.icon, color: n.color } }}
					title={n.name}
					status={n.status}
					footer={message}
				/>
			{/each}
		</Group>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	/* The whole alert, wrapped under the pill: it is the reason the row is here. */
	.message {
		/* Under the title: the 36px badge plus the row's 10px gap. */
		padding-inline-start: 2.875rem;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}
</style>
