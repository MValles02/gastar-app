<script lang="ts">
	import { resolve } from '$app/paths';
	import ActionLink from '#lib/components/ActionLink.svelte';
	import Meter from '#lib/components/Meter.svelte';
	import Amount from '#lib/components/base/Amount.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import { formatMoney, type Currency } from '#lib/money.ts';
	import { appear } from '#lib/motion.ts';
	import { openShallow } from '#lib/open-shallow.ts';

	/** This month's fixed payments in one currency: how much is paid, and the unpaid ones still due. */
	let {
		bills,
		currency,
		monthName
	}: {
		bills: {
			total: number;
			paid: number;
			allPaid: boolean;
			items: {
				id: string;
				description: string;
				amount: number;
				label: string;
				soon: boolean;
			}[];
		};
		currency: Currency;
		monthName: string;
	} = $props();

	let summary = $derived(
		`Pagaste ${formatMoney(bills.paid, currency)} de ${formatMoney(bills.total, currency)}`
	);
</script>

<section aria-labelledby="bills-heading" in:appear>
	<div class="section-head">
		<h2 id="bills-heading">Próximos vencimientos</h2>
		<ActionLink href="/plan" label="Ver plan" />
	</div>
	<Card.Root class="gap-2 px-5 py-4">
		<p class="summary">{summary}</p>
		<Meter
			percent={bills.total > 0 ? (bills.paid / bills.total) * 100 : 0}
			color="var(--positive)"
			label="Pagos fijos pagados"
			valueText={summary}
		/>
		{#if bills.allPaid}
			<p class="muted">Pagaste todos los pagos fijos de {monthName}.</p>
		{/if}
	</Card.Root>
	{#if bills.items.length > 0}
		<ul class="scroller">
			{#each bills.items as b (b.id)}
				<li>
					<a
						class="bill"
						href={resolve(`plan/recurring/${b.id}`)}
						onclick={(e) => openShallow(e, resolve(`plan/recurring/${b.id}`), 'rule')}
					>
						<span class="desc">{b.description}</span>
						<span class="amt"><Amount cents={b.amount} {currency} /></span>
						<StatusPill tone={b.soon ? 'warning' : 'neutral'} label={b.label} />
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.section-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
		margin-bottom: 0.875rem;
		padding-inline: var(--space-1);
	}

	.section-head h2 {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-muted);
	}

	.summary {
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.muted {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.scroller {
		display: flex;
		gap: var(--space-3);
		margin: var(--space-3) 0 0;
		padding: 0 0 var(--space-1);
		list-style: none;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}

	.scroller::-webkit-scrollbar {
		display: none;
	}

	.scroller li {
		flex: none;
	}

	.bill {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		box-sizing: border-box;
		width: 8.5rem;
		height: 100%;
		padding: var(--space-3);
		border: 1px solid var(--card-edge);
		border-radius: var(--radius-card);
		background: var(--surface);
		box-shadow: var(--shadow-1);
		color: inherit;
		text-decoration: none;
	}

	.desc {
		display: -webkit-box;
		overflow: hidden;
		font-size: 13px;
		font-weight: 500;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow-wrap: anywhere;
	}

	.amt {
		font-size: 15px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
</style>
