<script lang="ts">
	import { resolve } from '$app/paths';
	import { swatchVar } from '$lib/appearance';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Meter from '$lib/components/Meter.svelte';
	import Money from '$lib/components/Money.svelte';
	import { formatMoney, type Currency } from '$lib/money';

	type Limit = {
		categoryId: string;
		name: string;
		color: string | null;
		amount: number;
		spent: number;
		over: boolean;
		fast: boolean;
	};

	let { limits, currency, wizard }: { limits: Limit[]; currency: Currency; wizard?: number } =
		$props();
</script>

{#if limits.length}
	<ListCard>
		{#each limits as l (l.categoryId)}
			{@const pct = Math.min(100, Math.floor((l.spent * 100) / l.amount))}
			{#snippet value()}
				<span class="of">
					<span class="spent"><Money cents={l.spent} {currency} /></span> de
					<Money cents={l.amount} {currency} />
				</span>
			{/snippet}
			{#snippet footer()}
				<Meter
					percent={pct}
					color={swatchVar(l.color)}
					label="Límite de {l.name}"
					valueText="{formatMoney(l.spent, currency)} de {formatMoney(l.amount, currency)}"
				/>
			{/snippet}
			<ListRow
				href={resolve(`/plan/limits/${l.categoryId}${wizard ? `?wizard=${wizard}` : ''}`)}
				title={l.name}
				{value}
				status={l.over
					? { tone: 'bad', label: 'Te pasaste' }
					: l.fast
						? { tone: 'warning', label: 'Vas rápido' }
						: undefined}
				{footer}
			/>
		{/each}
	</ListCard>
{:else}
	<p class="muted">Sin límites.</p>
{/if}

<style>
	.muted {
		color: var(--text-muted);
	}

	.of {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.spent {
		color: var(--text);
		font-weight: 600;
	}
</style>
