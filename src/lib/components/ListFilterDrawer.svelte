<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { listRowShown } from '#lib/list-filter.ts';
	import { replaceGoto } from '#lib/nav-stack.svelte.ts';
	import { es } from '#lib/copy/es.ts';
	import Sheet from '#lib/components/base/Sheet.svelte';
	import Button from '#lib/components/base/Button.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import SwitchRow from '#lib/components/SwitchRow.svelte';

	type Option = { value: string; label: string };

	/**
	 * The accounts/categories FilterDrawer configuration: re-seeded from the applied `filters` every
	 * time it opens, counted client-side from `facets`. `currencyCounts`:
	 * the currency picks which rows are listed (accounts), not only which amounts show (categories).
	 */
	let {
		open = $bindable(false),
		path,
		filters,
		facets,
		currencyDefault,
		currencyOptions,
		currencyCounts,
		kindOptions,
		noun
	}: {
		open?: boolean;
		path: '/accounts' | '/categories';
		filters: { q: string; archived: boolean; currency: string; kind?: string };
		facets: { match: boolean; archived: boolean; currency?: string; kind?: string | null }[];
		currencyDefault: string;
		currencyOptions: Option[];
		currencyCounts: boolean;
		/** Shows the Tipo control first. */
		kindOptions?: Option[];
		/** Singular and plural, for "Ver N …". */
		noun: [string, string];
	} = $props();

	let archived = $state(false);
	let kind = $state('');
	let currency = $state(untrack(() => currencyDefault));
	$effect(() => {
		if (!open) return;
		archived = filters.archived;
		kind = filters.kind ?? '';
		currency = filters.currency;
	});
	const count = $derived(
		facets.filter((r) =>
			listRowShown(r, { archived, kind, currency: currencyCounts ? currency : undefined })
		).length
	);
	const clear = () => {
		archived = false;
		kind = '';
		currency = currencyDefault;
	};
	const href = $derived.by(() => {
		const sp = new SvelteURLSearchParams();
		if (filters.q) sp.set('q', filters.q);
		if (kind) sp.set('kind', kind);
		if (currency !== currencyDefault) sp.set('currency', currency);
		if (archived) sp.set('archived', '1');
		return resolve(`${path}?${sp}` as '');
	});

	const apply = () => {
		open = false;
		void replaceGoto(href, { reset: false });
	};
</script>

{#snippet footer()}
	<Button variant="outline" onclick={clear}>{es.ui.clear}</Button>
	<Button class="wide" onclick={apply}>{es.ui.showResults(count, noun)}</Button>
{/snippet}

<Sheet title={es.ui.filters} bind:open {footer}>
	<div class="filters">
		{#if kindOptions}
			<span id="kind-label" class="visually-hidden">{es.ui.type}</span>
			<SegmentedControl
				name="kind"
				options={kindOptions}
				bind:value={kind}
				labelledby="kind-label"
			/>
		{/if}
		<span id="currency-label" class="visually-hidden">{es.ui.currency}</span>
		<SegmentedControl
			name="currency"
			options={currencyOptions}
			bind:value={currency}
			labelledby="currency-label"
		/>
		<SwitchRow
			id="archived"
			name="archived"
			value="1"
			label={es.ui.showArchived}
			bind:checked={archived}
		/>
	</div>
</Sheet>

<style>
	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
</style>
