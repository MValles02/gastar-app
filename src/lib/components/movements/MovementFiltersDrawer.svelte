<script lang="ts">
	import { CURRENCY_OPTIONS } from '#lib/money.ts';
	import type { ComponentProps } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { thisMonth } from '#lib/dates.ts';
	import { replaceGoto } from '#lib/nav-stack.svelte.ts';
	import { es } from '#lib/copy/es.ts';
	import Sheet from '#lib/components/base/Sheet.svelte';
	import Button from '#lib/components/base/Button.svelte';
	import DateRangePicker from '#lib/components/pickers/DateRangePicker.svelte';
	import MultiPicker from '#lib/components/pickers/MultiPicker.svelte';
	import Segmented from '#lib/components/base/Segmented.svelte';

	type Picks = ComponentProps<typeof MultiPicker>['items'];

	/**
	 * The movements FilterDrawer configuration: N in "Ver N movimientos" is the server's count for
	 * the staged filters.
	 */
	let {
		open = $bindable(false),
		filters,
		accountIds,
		categoryIds,
		accounts,
		categories
	}: {
		open?: boolean;
		/** Applied scalar filters from the URL (`q`, `type`, `currency`, `from`, `to`). */
		filters: Record<string, string>;
		accountIds: string[];
		categoryIds: string[];
		/** Each with `meta` = its currency. */
		accounts: Picks;
		categories: Picks;
	} = $props();

	const currencyOptions = [{ value: '', label: 'Ambas' }, ...CURRENCY_OPTIONS];
	const typeOptions = [
		{ value: '', label: 'Todos' },
		{ value: 'outcome', label: 'Gastos' },
		{ value: 'income', label: 'Ingresos' },
		{ value: 'transfer', label: 'Transf.' }
	];

	let currency = $state('');
	let type = $state('');
	let from = $state('');
	let to = $state('');
	let stagedAccounts = $state<string[]>([]);
	let stagedCategories = $state<string[]>([]);
	let count = $state<number | null>(null);

	$effect(() => {
		if (!open) return;
		currency = filters.currency ?? '';
		type = filters.type ?? '';
		from = filters.from ?? '';
		to = filters.to ?? '';
		stagedAccounts = [...accountIds];
		stagedCategories = [...categoryIds];
	});

	const pickAccounts = $derived(accounts.filter((a) => a.id));
	const pickCategories = $derived(categories.filter((c) => c.id));

	// Selected accounts decide the currency: one shared currency is shown (and locked), mixed reads "Ambas".
	const lockedCurrency = $derived.by(() => {
		const set = new Set(
			pickAccounts.filter((a) => stagedAccounts.includes(a.id)).map((a) => a.meta ?? '')
		);
		return set.size === 1 ? [...set][0] : '';
	});

	const query = $derived.by(() => {
		// SvelteURLSearchParams: required by the svelte/prefer-svelte-reactivity lint rule.
		const sp = new SvelteURLSearchParams();
		if (filters.q) sp.set('q', filters.q);
		if (currency && !stagedAccounts.length) sp.set('currency', currency);
		if (type) sp.set('type', type);
		if (from) sp.set('from', from);
		if (to) sp.set('to', to);
		// No dates means every date, asked for explicitly (the list defaults to this month).
		if (!from && !to) sp.set('all', '1');
		for (const id of stagedAccounts) sp.append('account', id);
		for (const id of stagedCategories) sp.append('category', id);
		return sp.toString();
	});

	$effect(() => {
		if (!open) return;
		const qs = query;
		count = null;
		const ctl = new AbortController();
		const timer = setTimeout(async () => {
			try {
				const res = await fetch(`${resolve('movements/count')}?${qs}`, { signal: ctl.signal });
				if (res.ok) count = (await res.json()).count;
			} catch {
				// Aborted by a newer change (or offline): the button keeps its loading label.
			}
		}, 250);
		return () => {
			clearTimeout(timer);
			ctl.abort();
		};
	});

	const clear = () => {
		currency = type = '';
		[from, to] = thisMonth();
		stagedAccounts = [];
		stagedCategories = [];
	};

	const apply = () => {
		open = false;
		void replaceGoto(resolve(`movements?${query}`), { reset: false });
	};
</script>

{#snippet footer()}
	<Button variant="outline" onclick={clear}>{es.ui.clear}</Button>
	<Button class="wide" onclick={apply}>{es.ui.showResults(count, es.ui.movementNoun)}</Button>
{/snippet}

<Sheet title={es.ui.filters} bind:open {footer}>
	<div class="filters">
		<span id="f-currency-label" class="visually-hidden">{es.ui.currency}</span>
		<Segmented
			name="currency"
			options={currencyOptions}
			bind:value={() => (stagedAccounts.length ? lockedCurrency : currency), (v) => (currency = v)}
			labelledby="f-currency-label"
			disabled={stagedAccounts.length > 0}
		/>
		<span id="f-type-label" class="visually-hidden">{es.ui.type}</span>
		<Segmented name="type" options={typeOptions} bind:value={type} labelledby="f-type-label" />
		<div class="group">
			<DateRangePicker bind:from bind:to />
			<MultiPicker
				legend={es.ui.account}
				title={es.ui.account}
				plural={es.ui.accountsPlural}
				items={pickAccounts}
				bind:value={stagedAccounts}
			/>
			<MultiPicker
				legend={es.ui.category}
				title={es.ui.category}
				plural={es.ui.categoriesPlural}
				items={pickCategories}
				bind:value={stagedCategories}
			/>
		</div>
	</div>
</Sheet>

<style>
	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	/* Rows of one card, like the movement form. */
	.group {
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--card-edge);
		border-radius: var(--radius-card);
	}
</style>
