<script lang="ts">
	import type { Currency } from '$lib/money';
	import { resolve } from '$app/paths';
	import ListRow from './ListRow.svelte';
	import Money from './Money.svelte';

	let {
		m,
		date
	}: {
		m: {
			id: string;
			type: 'income' | 'outcome' | 'transfer';
			description: string;
			amount: number;
			currency: Currency;
			accountName: string;
			destinationAccountName: string | null;
			categoryName: string | null;
		};
		/** Pre-formatted day; omitted where a group header already shows it. */
		date?: string;
	} = $props();
</script>

{#snippet value()}
	<Money cents={m.amount} currency={m.currency} tone="flow" direction={m.type} />
{/snippet}

{#snippet dateMeta()}{date}{/snippet}

{#snippet where()}
	{#if m.type === 'transfer'}
		<span class="slot account">{m.accountName} → {m.destinationAccountName}</span>
	{:else}
		{#if m.categoryName}<span class="slot category">{m.categoryName}</span>{/if}
		<span class="slot account end">{m.accountName}</span>
	{/if}
{/snippet}

<ListRow
	href={resolve(`/movements/${m.id}`)}
	lead={m.type === 'transfer'
		? { icon: 'transfer', color: null }
		: { letter: m.description.charAt(0).toUpperCase(), color: null }}
	title={m.description}
	{value}
	meta={date ? dateMeta : undefined}
	metaEnd={where}
/>

<style>
	/* Line 2 never wraps: the account truncates first, then the category, then the date. */
	.slot {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Account has a zero basis, so it only gets leftover space and empties before the
	   category shrinks; the date (fixed dd/mm/aaaa) shrinks last. */
	.category {
		flex: 0 1000 auto;
	}

	.account {
		flex: 1 1 0;
	}

	.end {
		text-align: end;
	}
</style>
