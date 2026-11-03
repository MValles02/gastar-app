<script lang="ts">
	import type { Currency } from '$lib/money';
	import { resolve } from '$app/paths';
	import type { CategoryIconKey, SwatchKey } from '$lib/appearance';
	import { highlight } from '$lib/highlight.svelte';
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
			categoryIcon: CategoryIconKey | null;
			categoryColor: SwatchKey | null;
		};
		/** Pre-formatted day; omitted where a group header already shows it. */
		date?: string;
	} = $props();

	const highlighted = $derived(highlight.id === m.id);
</script>

{#snippet value()}
	<Money cents={m.amount} currency={m.currency} tone="flow" direction={m.type} />
{/snippet}

{#snippet dateMeta()}{date}{/snippet}

{#snippet accountMeta()}
	{m.type === 'transfer' ? `${m.accountName} → ${m.destinationAccountName}` : m.accountName}
{/snippet}

{#snippet where()}
	<span class="end">{@render accountMeta()}</span>
{/snippet}

<!-- The wrapper only carries the e2e/test hook; it adds no box. -->
<div class="hl" data-highlighted={highlighted ? 'true' : undefined}>
	<ListRow
		class={highlighted ? 'highlighted' : ''}
		href={resolve(`/movements/${m.id}`)}
		lead={m.type === 'transfer'
			? { icon: 'transfer', color: null, glyph: 'var(--transfer)' }
			: m.categoryColor || m.categoryIcon
				? {
						icon: m.categoryIcon ?? undefined,
						letter: m.categoryIcon ? undefined : m.description.charAt(0).toUpperCase(),
						color: m.categoryColor
					}
				: { letter: m.description.charAt(0).toUpperCase(), color: null }}
		title={m.description}
		{value}
		meta={date ? dateMeta : accountMeta}
		metaEnd={date ? where : undefined}
	/>
</div>

<style>
	.hl {
		display: contents;
	}

	/* Just saved: a primary tint that fades out (static under reduced motion; the state clears it). */
	.hl :global(.highlighted) {
		background: color-mix(in srgb, var(--primary) 14%, transparent);
	}

	@media (prefers-reduced-motion: no-preference) {
		.hl :global(.highlighted) {
			animation: fade-tint 3s ease-out forwards;
		}
	}

	@keyframes fade-tint {
		from {
			background: color-mix(in srgb, var(--primary) 14%, transparent);
		}
		to {
			background: transparent;
		}
	}

	/* Line 2 never wraps: the account truncates first, then the date. */
	.end {
		flex: 1 1 0;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		text-align: end;
	}
</style>
