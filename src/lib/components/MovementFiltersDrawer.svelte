<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { thisMonth } from '$lib/dates';
	import { replaceGoto } from '$lib/nav-stack.svelte';
	import BottomDrawer from './BottomDrawer.svelte';
	import DateRangePicker from './DateRangePicker.svelte';
	import MultiPicker from './MultiPicker.svelte';
	import SegmentedControl from './SegmentedControl.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	type Picks = ComponentProps<typeof MultiPicker>['items'];

	/**
	 * Movements filters. Changes are staged here (nothing navigates or reloads) and applied by
	 * "Ver N movimientos", where N is the server's count for the staged filters.
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

	const currencyOptions = [
		{ value: '', label: 'Ambas' },
		{ value: 'ARS', label: 'Pesos' },
		{ value: 'USD', label: 'Dólares' }
	];
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

	// Every time the drawer opens, stage what is applied now.
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

	// Count for the staged filters, debounced; a newer change aborts the previous request.
	$effect(() => {
		if (!open) return;
		const qs = query;
		count = null;
		const ctl = new AbortController();
		const timer = setTimeout(async () => {
			try {
				const res = await fetch(`${resolve('/movements/count')}?${qs}`, { signal: ctl.signal });
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
		void replaceGoto(resolve(`/movements?${query}`), { keepFocus: true });
	};

	const viewLabel = $derived(
		count === null
			? 'Ver movimientos'
			: `Ver ${count} ${count === 1 ? 'movimiento' : 'movimientos'}`
	);
</script>

<BottomDrawer title="Filtros" bare bind:open>
	<div class="scroll">
		<span id="f-currency-label" class="visually-hidden">Moneda</span>
		<SegmentedControl
			name="currency"
			options={currencyOptions}
			bind:value={() => (stagedAccounts.length ? lockedCurrency : currency), (v) => (currency = v)}
			labelledby="f-currency-label"
			disabled={stagedAccounts.length > 0}
		/>
		<span id="f-type-label" class="visually-hidden">Tipo</span>
		<SegmentedControl
			name="type"
			options={typeOptions}
			bind:value={type}
			labelledby="f-type-label"
		/>
		<div class="group">
			<DateRangePicker nested bind:from bind:to />
			<MultiPicker
				legend="Cuenta"
				title="Cuenta"
				plural="cuentas"
				items={pickAccounts}
				bind:value={stagedAccounts}
			/>
			<MultiPicker
				legend="Categoría"
				title="Categoría"
				plural="categorías"
				items={pickCategories}
				bind:value={stagedCategories}
			/>
		</div>
	</div>
	<div class="actions">
		<Button
			type="button"
			variant="outline"
			class="h-[50px] min-w-0 flex-1 basis-0 rounded-full text-[15px] font-semibold"
			onclick={clear}>Limpiar</Button
		>
		<Button
			type="button"
			class="h-[50px] min-w-0 flex-[2] basis-0 rounded-full text-[15px] font-semibold whitespace-nowrap"
			onclick={apply}>{viewLabel}</Button
		>
	</div>
</BottomDrawer>

<style>
	/* The filters scroll; the actions stay pinned below them. */
	.scroll {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-height: 0;
		overflow-y: auto;
		padding: var(--space-1) var(--space-4) var(--space-4);
	}

	/* Rows of one card, like the movement form. */
	.group {
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.actions {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--popover);
	}
</style>
