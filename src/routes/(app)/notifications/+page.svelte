<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const currencyName = { ARS: 'Pesos', USD: 'Dólares' } as const;
</script>

<svelte:head>
	<title>Avisos · Gastar</title>
</svelte:head>

<PageHeader title="Avisos" back={{ href: resolve('/'), label: 'Volver al inicio' }} />

<div class="page">
	{#if data.groups.length === 0}
		<EmptyState icon="bell">Estás al día. No hay pagos por vencer ni excesos en tu plan.</EmptyState
		>
	{:else}
		{#each data.groups as g (g.currency)}
			<section aria-labelledby="alerts-{g.currency}">
				<div class="section-head"><h2 id="alerts-{g.currency}">{currencyName[g.currency]}</h2></div>
				<ul class="list-card">
					{#each g.items as n (n.id)}
						<li>
							{#snippet row()}
								<span class="title">{n.title}</span>
								<span class="sub">{n.body}</span>
							{/snippet}
							{#if n.href}
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- server-built app path (with query) -->
								<a class="item" href={n.href}>{@render row()}</a>
							{:else}
								<!-- Opens /plan in this currency: /plan reads it from the cookie, so switch it first. -->
								<form method="POST" action={resolve('/currency')}>
									<input type="hidden" name="currency" value={g.currency} />
									<input type="hidden" name="redirectTo" value="/plan" />
									<button class="item" type="submit">{@render row()}</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	.item {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		width: 100%;
		min-height: 2.75rem;
		padding: var(--space-3) var(--space-4);
		border: 0;
		border-bottom: 1px solid var(--border);
		background: none;
		color: inherit;
		font: inherit;
		text-align: start;
		text-decoration: none;
		cursor: pointer;
	}

	/* The card clips overflow, so the focus ring sits inside the row. */
	.item:focus-visible {
		outline-offset: -2px;
	}

	li:last-child .item {
		border-bottom: 0;
	}

	@media (hover: hover) {
		.item:hover {
			background: var(--muted);
		}
	}

	.title {
		font-size: var(--font-size-sm);
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.sub {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}
</style>
