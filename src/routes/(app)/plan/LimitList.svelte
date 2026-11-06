<script lang="ts">
	import { resolve } from '$app/paths';
	import { swatchVar, toCategoryIconKey, toSwatchKey } from '$lib/appearance';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Meter from '$lib/components/Meter.svelte';
	import Money from '$lib/components/Money.svelte';
	import { formatMoney, type Currency } from '$lib/money';
	import { openShallow } from '$lib/open-shallow';

	type Limit = {
		categoryId: string;
		name: string;
		color: string | null;
		icon?: string | null;
		amount: number;
		spent: number;
		over: boolean;
		fast: boolean;
	};

	/**
	 * Category limits as Inicio's category rows: glyph, name, then % of the limit (muted) and what was spent inline, the meter
	 * below; over the limit the % and the meter turn red. Outside the wizard a click opens the limit's
	 * drawer over the screen; in the wizard (`wizard` step) the row links to the page.
	 */
	let {
		limits,
		currency,
		wizard,
		linked = true
	}: { limits: Limit[]; currency: Currency; wizard?: number; linked?: boolean } = $props();

	// An unmodified click opens the drawer (shallow route, URL unchanged); anything else follows the link.
	async function open(e: MouseEvent, id: string) {
		if (wizard || !(e.target as Element).closest('a')) return;
		await openShallow(e, resolve(`/plan/limits/${id}`), 'limit');
	}
</script>

{#if limits.length}
	<ListCard>
		{#each limits as l (l.categoryId)}
			{@const pct = l.amount > 0 ? Math.floor((l.spent * 100) / l.amount) : 0}
			{#snippet value()}
				<span class="inline"
					><span class="pct" class:over={l.over}>{pct}%</span><Money
						cents={l.spent}
						{currency}
					/></span
				>
			{/snippet}
			{#snippet footer()}
				<Meter
					percent={Math.min(100, pct)}
					color={l.over ? 'var(--negative)' : swatchVar(l.color)}
					label="Límite de {l.name}"
					valueText="{formatMoney(l.spent, currency)} de {formatMoney(l.amount, currency)}"
				/>
			{/snippet}
			<!-- The wrapper only carries the click that opens the drawer; it adds no box. -->
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div onclick={(e) => open(e, l.categoryId)}>
				<ListRow
					href={linked
						? resolve(`/plan/limits/${l.categoryId}${wizard ? `?wizard=${wizard}` : ''}`)
						: undefined}
					lead={{
						icon: toCategoryIconKey(l.icon ?? null) ?? undefined,
						letter: toCategoryIconKey(l.icon ?? null) ? undefined : l.name.charAt(0).toUpperCase(),
						color: toSwatchKey(l.color)
					}}
					title={l.name}
					{value}
					{footer}
				/>
			</div>
		{/each}
	</ListCard>
{:else}
	<EmptyState icon="plan" description="Sin límites." />
{/if}

<style>
	.inline {
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-2);
	}

	.pct {
		font-size: var(--font-size-sm);
		font-weight: 400;
		color: var(--text-muted);
	}

	.pct.over {
		color: var(--negative);
		font-weight: 600;
	}
</style>
