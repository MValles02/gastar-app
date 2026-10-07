<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
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
		<EmptyState icon="bell">Estás al día.</EmptyState>
	{:else}
		{#each data.groups as g (g.currency)}
			<section class="group" aria-labelledby="alerts-{g.currency}">
				<h2 id="alerts-{g.currency}">{currencyName[g.currency]}</h2>
				<ul class="list-card">
					{#each g.items as n (n.id)}
						<li>
							{#snippet row()}
								<span class="lead" aria-hidden="true">
									{#if n.id.startsWith('plan-')}<Icon name="plan" size="1.25rem" />{:else}{n.title
											.charAt(0)
											.toUpperCase()}{/if}
								</span>
								<span class="text">
									<span class="title">{n.title}</span>
									<span class="sub">{n.body}</span>
								</span>
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

	.group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	h2 {
		padding: 0 var(--space-1);
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: var(--space-3);
		width: 100%;
		min-height: 4rem;
		padding: var(--space-3) var(--space-4);
		border: 0;
		border-bottom: 1px solid var(--border);
		border-radius: 0;
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
			opacity: 1;
		}
	}

	.item:active {
		background: var(--muted);
	}

	/* Neutral badge: alerts carry no category colour. */
	.lead {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--radius-pill);
		background: var(--muted);
		color: var(--text);
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}

	.title {
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.sub {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}
</style>
