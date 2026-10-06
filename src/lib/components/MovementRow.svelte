<script lang="ts">
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
			currency: 'ARS' | 'USD';
		};
	} = $props();
</script>

<ListRow href={resolve(`/movements/${m.id}`)}>
	{#snippet leading()}
		<span class="row-icon" aria-hidden="true">
			{#if m.type === 'transfer'}<Icon name="transfer" size="1.125rem" />{:else}{m.description
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
