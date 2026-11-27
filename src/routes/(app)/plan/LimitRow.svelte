<script lang="ts">
	import { resolve } from '$app/paths';
	import { toneOf } from '#lib/appearance.ts';
	import Amount from '#lib/components/base/Amount.svelte';
	import Meter from '#lib/components/base/Meter.svelte';
	import Row from '#lib/components/base/Row.svelte';
	import { es } from '#lib/copy/es.ts';
	import { formatMoney, type Currency } from '#lib/money.ts';
	import { openShallow } from '#lib/open-shallow.ts';
	import { limitPercent } from '#lib/plan.ts';
	import { withWizard } from '#lib/plan-wizard.ts';

	type Limit = {
		categoryId: string;
		name: string;
		color: string | null;
		icon?: string | null;
		amount: number;
		currency: Currency;
		spent: number;
		over: boolean;
	};

	/**
	 * One category limit as Inicio's category rows: glyph, name, then % of the limit (muted) and what was
	 * spent inline, the meter below; over the limit the % and the meter turn red. Outside the wizard a
	 * click opens the limit's drawer over the screen; in the wizard (`wizard` step) the row links to the page.
	 */
	let { l, wizard }: { l: Limit; wizard?: number } = $props();

	const pct = $derived(limitPercent(l.spent, l.amount));
</script>

{#snippet trailing()}
	<span class="inline"
		><span class="pct" class:over={l.over}>{pct}%</span><Amount
			cents={l.spent}
			currency={l.currency}
		/></span
	>
{/snippet}

{#snippet footer()}
	<Meter
		percent={Math.min(100, pct)}
		tone={l.over ? 'expense' : toneOf(l.color)}
		label={es.plan.limits.meterLabel(l.name)}
		valueText={es.plan.limits.meterValue(
			formatMoney(l.spent, l.currency),
			formatMoney(l.amount, l.currency)
		)}
	/>
{/snippet}

<!-- An unmodified click opens the drawer (shallow route, URL unchanged); anything else follows the link. -->
<Row
	href={withWizard(resolve(`plan/limits/${l.categoryId}`), wizard)}
	onclick={wizard
		? undefined
		: (e) => openShallow(e, resolve(`plan/limits/${l.categoryId}`), 'limit')}
	glyph={{ category: { icon: l.icon ?? null, color: l.color } }}
	title={l.name}
	{trailing}
	{footer}
/>

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
