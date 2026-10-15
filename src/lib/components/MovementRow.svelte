<script lang="ts">
	import type { Currency } from '$lib/money';
	import { resolve } from '$app/paths';
	import Icon from './Icon.svelte';
	import * as Item from '$lib/components/ui/item/index.js';
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

<Item.Root>
	{#snippet child({ props })}
		<a href={resolve(`/movements/${m.id}`)} {...props}>
			<Item.Media>
				<span class="lead" aria-hidden="true">
					{#if m.type === 'transfer'}<Icon name="transfer" size="1.25rem" />{:else}{m.description
							.charAt(0)
							.toUpperCase()}{/if}
				</span>
			</Item.Media>
			<Item.Content class="min-w-0">
				<Item.Title class="block w-full min-w-0 truncate">{m.description}</Item.Title>
				<Item.Description class="line-clamp-none flex min-w-0 gap-2">
					{#if date}<span class="slot date">{date}</span>{/if}
					{#if m.type === 'transfer'}
						<span class="slot account">{m.accountName} → {m.destinationAccountName}</span>
					{:else}
						{#if m.categoryName}<span class="slot category">{m.categoryName}</span>{/if}
						<span class="slot account end">{m.accountName}</span>
					{/if}
				</Item.Description>
			</Item.Content>
			<Item.Actions>
				<span class="row-amount">
					<Money cents={m.amount} currency={m.currency} kind={m.type} />
				</span>
			</Item.Actions>
		</a>
	{/snippet}
</Item.Root>

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

	/* Line 2 never wraps: the account truncates first, then the category, then the date. */
	.slot {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Account has a zero basis, so it only gets leftover space and empties before the
	   category shrinks; the date (fixed dd/mm/aaaa) shrinks last. */
	.date {
		flex: 0 1 auto;
	}

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
