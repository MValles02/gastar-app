<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
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
	{#if data.groups.length === 0}
		<EmptyState
			icon="bell"
			description="Estás al día. Acá vas a ver los pagos fijos por vencer y los límites o el plan cuando vayan rápido o se pasen."
		/>
	{:else}
		{#each data.groups as g (g.currency)}
			<section aria-labelledby="alerts-{g.currency}">
				<SectionHeader
					id="alerts-{g.currency}"
					title={g.currency === 'ARS' ? 'Pesos' : 'Dólares'}
					variant="group"
				/>
				<ListCard>
					{#each g.items as n (n.id)}
						{#snippet message()}{n.message}{/snippet}
						{#snippet dueMeta()}
							<span class:overdue={n.status.tone === 'bad'}>{n.status.label}</span> · {n.accountName}
						{/snippet}
						{#snippet amount()}
							<Money cents={n.amount ?? 0} currency={g.currency} tone="flow" direction="outcome" />
						{/snippet}
						{#snippet statusPill()}
							{#if n.kind !== 'payment'}<StatusPill
									tone={n.status.tone}
									label={n.status.label}
								/>{/if}
						{/snippet}
						{#snippet row(submit: boolean)}
							<ListRow
								href={submit ? undefined : n.href}
								{submit}
								lead={n.kind === 'plan'
									? { icon: 'plan', color: null }
									: n.icon
										? { icon: n.icon, color: n.color }
										: { letter: n.name.charAt(0).toUpperCase(), color: n.color }}
								title={n.name}
								value={n.kind === 'payment' ? amount : statusPill}
								meta={n.kind === 'payment' ? dueMeta : message}
							/>
						{/snippet}
						{#if !n.switchCurrency}
							{@render row(false)}
						{:else}
							<!-- Plan and limit pages read the currency from the cookie, so switch it first. -->
							<form method="POST" action={resolve('/currency')} class="contents">
								<input type="hidden" name="currency" value={g.currency} />
								<input type="hidden" name="redirectTo" value={n.href} />
								{@render row(true)}
							</form>
						{/if}
					{/each}
				</ListCard>
			</section>
		{/each}
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

	.overdue {
		color: var(--negative);
	}
</style>
