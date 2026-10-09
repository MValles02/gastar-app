<script lang="ts">
	import type { Currency } from '$lib/money';
	import { resolve } from '$app/paths';
	import Icon from './Icon.svelte';
	import ListRow from './ListRow.svelte';
	import Money from './Money.svelte';

	let {
		m
	}: {
		m: {
			id: string;
			type: 'income' | 'outcome' | 'transfer';
			description: string;
			subtitle: string;
			amount: number;
			currency: Currency;
		};
	} = $props();
</script>

<ListRow href={resolve(`/movements/${m.id}`)}>
	{#snippet leading()}
		<span class="lead" aria-hidden="true">
			{#if m.type === 'transfer'}<Icon name="transfer" size="1.25rem" />{:else}{m.description
					.charAt(0)
					.toUpperCase()}{/if}
		</span>
	{/snippet}
	{#snippet title()}{m.description}{/snippet}
	{#snippet subtitle()}{m.subtitle}{/snippet}
	{#snippet trailing()}
		<span class="row-amount"><Money cents={m.amount} currency={m.currency} kind={m.type} /></span>
	{/snippet}
</ListRow>

<style>
	/* Neutral letter badge: the movement carries no category colour here. */
	.lead {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--radius);
		background: var(--muted);
		color: var(--text);
		font-size: 0.9375rem;
		font-weight: 600;
	}
</style>
