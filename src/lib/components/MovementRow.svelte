<script lang="ts">
	import type { Currency } from '#lib/money.ts';
	import { resolve } from '$app/paths';
	import type { CategoryIconKey, SwatchKey } from '#lib/appearance.ts';
	import { highlight } from '#lib/highlight.svelte.ts';
	import { openShallow } from '#lib/open-shallow.ts';
	import ListRow from './ListRow.svelte';
	import Money from './Money.svelte';

	let {
		m,
		date
		/** Cross-currency transfer: the destination amount, shown under the amount. */
		/** Pre-formatted day; omitted where a group header already shows it. */
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
			secondary?: { cents: number; currency: Currency } | null;
		};
		date?: string;
	} = $props();

	const highlighted = $derived(highlight.id === m.id);

	// Only a click on the link opens the detail drawer over the list.
	const open = (e: MouseEvent) =>
		(e.target as Element).closest('a') && openShallow(e, resolve(`movements/${m.id}`), 'movement');
</script>

{#snippet value()}
	<Money cents={m.amount} currency={m.currency} tone="flow" direction={m.type} />
	{#if m.secondary}
		<span class="secondary"
			><Money cents={m.secondary.cents} currency={m.secondary.currency} /></span
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
		{meta}
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

	.secondary {
		display: block;
		font-size: var(--font-size-xs);
		font-weight: 400;
		color: var(--text-muted);
	}
</style>
