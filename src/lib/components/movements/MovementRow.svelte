<script lang="ts">
	import type { Currency } from '#lib/money.ts';
	import { resolve } from '$app/paths';
	import type { CategoryIconKey, SwatchKey } from '#lib/appearance.ts';
	import { highlight } from '#lib/highlight.svelte.ts';
	import { openShallow } from '#lib/open-shallow.ts';
	import ListRow from '#lib/components/ListRow.svelte';
	import Amount from '#lib/components/base/Amount.svelte';

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
			categoryName?: string | null;
			categoryIcon: CategoryIconKey | null;
			categoryColor: SwatchKey | null;
			/** Cross-currency transfer: the destination amount, shown under the amount. */
			secondary?: { cents: number; currency: Currency } | null;
		};
		/** Pre-formatted day; omitted where a group header already shows it. */
		date?: string;
	} = $props();

	const highlighted = $derived(highlight.id === m.id);

	// Only a click on the link opens the detail drawer over the list.
	const open = (e: MouseEvent) =>
		(e.target as Element).closest('a') && openShallow(e, resolve(`movements/${m.id}`), 'movement');
</script>

{#snippet value()}
	<Amount
		cents={m.amount}
		currency={m.currency}
		tone={m.type === 'income' ? 'income' : m.type === 'outcome' ? 'expense' : 'neutral'}
	/>
	{#if m.secondary}
		<span class="secondary"
			><Amount cents={m.secondary.cents} currency={m.secondary.currency} /></span
		>
	{/if}
{/snippet}

<!-- Canvas: "Cuenta · día" on the left, the amount alone on the right. -->
{#snippet meta()}
	{m.type === 'transfer' ? `${m.accountName} → ${m.destinationAccountName}` : m.accountName}{date
		? ` · ${date}`
		: ''}
{/snippet}

<!-- The wrapper only carries the e2e/test hook; it adds no box. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="hl" data-highlighted={highlighted ? 'true' : undefined} onclick={open}>
	<ListRow
		class={highlighted ? 'highlighted' : ''}
		href={resolve(`movements/${m.id}`)}
		glyph={m.type === 'transfer'
			? { icon: 'transfer', tone: 'muted' }
			: {
					category:
						(m.categoryName ?? m.categoryIcon ?? m.categoryColor)
							? { icon: m.categoryIcon, color: m.categoryColor }
							: null
				}}
		title={m.description}
		status={m.categoryName && m.type !== 'transfer'
			? { tone: 'neutral', label: m.categoryName }
			: undefined}
		{value}
		{meta}
	/>
</div>

<style>
	.hl {
		display: contents;
	}

	/* Just saved: a primary tint behind the row, held while `highlight` flags it, then faded out
	   (an opacity transition, so a new highlight retargets instead of restarting). */
	.hl > :global([role='listitem']) {
		position: relative;
		isolation: isolate;
	}

	.hl > :global([role='listitem'])::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: color-mix(in srgb, var(--primary) 14%, transparent);
		opacity: 0;
		pointer-events: none;
		transition: opacity 1.2s var(--ease-out);
	}

	.hl > :global(.highlighted)::before {
		opacity: 1;
		transition: none;
	}

	.secondary {
		display: block;
		font-size: var(--font-size-xs);
		font-weight: 400;
		color: var(--text-muted);
	}
</style>
