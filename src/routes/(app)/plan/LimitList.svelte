<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Clock from '@lucide/svelte/icons/clock';
	import { resolve } from '$app/paths';
	import { swatchVar } from '$lib/appearance';
	import * as Item from '$lib/components/ui/item/index.js';
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
	<Item.Group
		class="gap-0 overflow-hidden rounded-(--radius-card) border border-(--border) bg-(--surface) shadow-(--shadow-1)"
	>
		{#each limits as l (l.categoryId)}
			{@const pct = Math.min(100, Math.floor((l.spent * 100) / l.amount))}
			<div role="listitem">
				<a
					class="limit"
					style:--tone={swatchVar(l.color)}
					href={resolve(`/plan/limits/${l.categoryId}${wizard ? `?wizard=${wizard}` : ''}`)}
				>
					<span class="name">
						<span class="title">{l.name}</span>
						{#if l.over}
							<span class="pill over"><CircleAlert size={14} strokeWidth={2} />Te pasaste</span>
						{:else if l.fast}
							<span class="pill warn"><Clock size={14} strokeWidth={2} />Vas rápido</span>
						{/if}
					</span>
					<span class="of">
						<span class="spent"><Money cents={l.spent} {currency} /></span> de
						<Money cents={l.amount} {currency} />
					</span>
					<div
						class="bar"
						role="meter"
						aria-label="Límite de {l.name}"
						aria-valuemin="0"
						aria-valuemax="100"
						aria-valuenow={pct}
						aria-valuetext="{formatMoney(l.spent, currency)} de {formatMoney(l.amount, currency)}"
					>
						<span class="fill" style:width="{pct}%"></span>
					</div>
				</a>
			</div>
		{/each}
	</Item.Group>
{:else}
	<p class="muted">Sin límites.</p>
{/if}

<style>
	.muted {
		color: var(--text-muted);
	}

	.limit {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1) var(--space-3);
		padding: 0.875rem var(--space-4);
		border-bottom: 1px solid var(--border);
		color: inherit;
		text-decoration: none;
	}

	[role='listitem']:last-child .limit {
		border-bottom: 0;
	}

	@media (hover: hover) {
		.limit:hover {
			background: var(--muted);
		}
	}

	.limit:active {
		background: var(--muted);
	}

	.name {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		font-weight: 500;
	}

	.title {
		overflow-wrap: anywhere;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.625rem;
		border-radius: var(--radius-pill);
		background: var(--muted);
		color: var(--text-muted);
		font-size: var(--font-size-xs);
		font-weight: 600;
		white-space: nowrap;
	}

	.pill.warn {
		background: color-mix(in srgb, var(--swatch-orange) 14%, transparent);
		color: var(--swatch-orange);
	}

	/* Over budget is information, not an error: inverted fill, never red. */
	.pill.over {
		background: var(--text);
		color: var(--bg);
	}

	.of {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.spent {
		color: var(--text);
		font-weight: 600;
	}

	.bar {
		flex: 1 0 100%;
		height: 0.375rem;
		margin-top: var(--space-2);
		overflow: hidden;
		background: var(--muted);
		border-radius: var(--radius-pill);
	}

	.fill {
		display: block;
		height: 100%;
		background: var(--tone);
		border-radius: var(--radius-pill);
	}
</style>
