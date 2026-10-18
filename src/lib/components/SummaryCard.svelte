<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import Money from '$lib/components/Money.svelte';
	import type { Currency } from '$lib/money';

	/** The plan's equation: income, fixed payments, savings, what is left to spend, and optionally spent and limits. */
	let {
		currency,
		income,
		bills,
		savings,
		forSpending,
		spent,
		pendingBills = 0,
		savingsHref,
		limits = [],
		header
	}: {
		currency: Currency;
		income: number;
		bills: number;
		savings: number;
		forSpending: number;
		spent?: number;
		/** Fixed payments not yet paid this month; shown only with `spent`. */
		pendingBills?: number;
		/** Resolved href; when set, the Ahorro row is a link. */
		savingsHref?: string;
		limits?: { categoryId: string; name: string; amount: number }[];
		header?: Snippet;
	} = $props();
</script>

<Card.Root class="gap-0 overflow-hidden py-0">
	{#if header}<div class="box">{@render header()}</div>{/if}
	<dl class="figures" class:bordered={!!header}>
		<div class="kv">
			<dt>Ingresos</dt>
			<dd><Money cents={income} {currency} tone="flow" direction="income" /></dd>
		</div>
		{#if spent === undefined}
			<div class="kv">
				<dt>Pagos fijos</dt>
				<dd><Money cents={-bills} {currency} tone="flow" direction="outcome" /></dd>
			</div>
		{/if}
		<div class="kv" class:link={!!savingsHref}>
			<dt>
				{#if savingsHref}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass a resolved href -->
					<a href={savingsHref}>Ahorro</a>
				{:else}
					Ahorro
				{/if}
			</dt>
			<dd>
				<Money cents={savings} {currency} />
				{#if savingsHref}<Icon name="chevron-right" size="1.25rem" />{/if}
			</dd>
		</div>
		{#if spent === undefined}
			<div class="kv sum">
				<dt>Para gastar</dt>
				<dd><Money cents={forSpending} {currency} /></dd>
			</div>
		{:else}
			<div class="kv">
				<dt>Pagos fijos pendientes</dt>
				<dd><Money cents={-pendingBills} {currency} tone="flow" direction="outcome" /></dd>
			</div>
			<div class="kv">
				<dt>Gastado</dt>
				<dd><Money cents={-spent} {currency} tone="flow" direction="outcome" /></dd>
			</div>
		{/if}
		{#each limits as l (l.categoryId)}
			<div class="kv">
				<dt>{l.name}</dt>
				<dd><Money cents={l.amount} {currency} /></dd>
			</div>
		{/each}
	</dl>
</Card.Root>

<style>
	.box {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 1.25rem 1.25rem var(--space-4);
	}

	.figures {
		padding: 0 1.25rem;
		font-size: var(--font-size-sm);
	}

	.figures.bordered {
		border-top: 1px solid var(--border);
	}

	.kv {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0 var(--space-3);
		min-height: 3rem;
	}

	.kv + .kv {
		border-top: 1px solid var(--border);
	}

	.figures dt {
		font-weight: 500;
		color: var(--text-muted);
	}

	.figures dd {
		margin: 0;
		margin-inline-start: auto;
		text-align: end;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.figures .sum dt {
		color: var(--text);
		font-weight: 600;
	}

	.figures .sum dd {
		font-weight: 600;
	}

	.kv.link {
		position: relative;
	}

	.kv.link a {
		color: inherit;
		text-decoration: none;
	}

	/* The whole row is the tap target. */
	.kv.link a::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	.kv.link dd {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.kv.link dd :global(svg) {
		color: var(--border-strong);
	}

	@media (hover: hover) {
		.kv.link:hover {
			background: var(--muted);
		}
	}

	.kv.link:active {
		background: var(--muted);
	}
</style>
