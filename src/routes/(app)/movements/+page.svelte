<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Lock from '@lucide/svelte/icons/lock';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import Button from '$lib/components/Button.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import MovementRow from '$lib/components/MovementRow.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let type = $derived<string>(data.filters.type);
	let account = $derived<string>(data.filters.account);
	let category = $derived<string>(data.filters.category);
	let from = $derived<string>(data.filters.from);
	let to = $derived<string>(data.filters.to);
	let currency = $derived<string>(data.lockedCurrency ?? data.filters.currency);

	const currencyOptions = [
		{ value: '', label: 'Ambas' },
		{ value: 'ARS', label: 'ARS' },
		{ value: 'USD', label: 'USD' }
	];

	const typeOptions = [
		{ value: '', label: 'Todos' },
		{ value: 'income', label: 'Ingresos' },
		{ value: 'outcome', label: 'Gastos' },
		{ value: 'transfer', label: 'Transf.' }
	];

	// Same filters, other page.
	const filterParams = () => {
		// SvelteURLSearchParams: required by the svelte/prefer-svelte-reactivity lint rule.
		const sp = new SvelteURLSearchParams();
		for (const [k, v] of Object.entries(data.filters)) if (v) sp.set(k, v);
		return sp;
	};
	const pageQuery = (page: number) => {
		const sp = filterParams();
		sp.set('page', String(page));
		return sp.toString();
	};
	const firstPageQuery = $derived(filterParams().toString());

	// The search term is not a filter: the badge and Limpiar count only the drawer filters.
	const filterCount = $derived(data.activeCount - (data.filters.q ? 1 : 0));

	let filtersOpen = $state(false);
	let drawerForm: HTMLFormElement | null = $state(null);

	// The drawer is portaled out of the app root, so SvelteKit does not intercept its GET form:
	// navigate by hand (without JS the plain form in <noscript> submits natively).
	const applyFilters = (e: SubmitEvent) => {
		e.preventDefault();
		const sp = new SvelteURLSearchParams();
		for (const [k, v] of new FormData(drawerForm!)) if (typeof v === 'string' && v) sp.set(k, v);
		void goto(resolve(`/movements?${sp}`), { keepFocus: true, replaceState: true });
	};
	const clearFilters = () => void goto(resolve('/movements'), { keepFocus: true });

	// Params the search form keeps (it owns only q and currency).
	const kept = $derived({
		type: data.filters.type,
		account: data.filters.account,
		category: data.filters.category,
		from: data.filters.from,
		to: data.filters.to
	});
</script>

<svelte:head>
	<title>Movimientos · Gastar</title>
</svelte:head>

<PageHeader title="Movimientos" />

{#snippet fields()}
	<SegmentedControl name="type" options={typeOptions} bind:value={type} />
	<div class="group">
		<OptionPicker
			name="account"
			legend="Cuenta"
			title="Cuenta"
			items={data.accounts}
			bind:value={account}
			placeholder="Todas"
			variant="row"
		>
			{#snippet empty()}{/snippet}
		</OptionPicker>
		<OptionPicker
			name="category"
			legend="Categoría"
			title="Categoría"
			items={data.categories}
			bind:value={category}
			placeholder="Todas"
			variant="row"
		>
			{#snippet empty()}{/snippet}
		</OptionPicker>
		<label class="date-row">
			<span>Desde</span>
			<input type="date" name="from" bind:value={from} />
		</label>
		<label class="date-row">
			<span>Hasta</span>
			<input type="date" name="to" bind:value={to} />
		</label>
	</div>
{/snippet}

<div class="page">
	<FilterBar q={data.filters.q} label="Buscar" placeholder="Buscar" hidden={kept}>
		{#snippet trailing()}
			<button
				type="button"
				class="filters-btn"
				class:active={filterCount > 0}
				aria-haspopup="dialog"
				onclick={() => (filtersOpen = true)}
			>
				<SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
				Filtros
				{#if filterCount > 0}<span class="count">{filterCount}</span>{/if}
			</button>
		{/snippet}
		<span id="currency-label" class="visually-hidden">Moneda</span>
		<SegmentedControl
			name="currency"
			options={currencyOptions}
			bind:value={currency}
			labelledby="currency-label"
			disabled={data.lockedCurrency !== null}
		/>
		{#if data.lockedCurrency !== null}
			<p class="lock">
				<Lock size={14} strokeWidth={1.75} aria-hidden="true" />Moneda de la cuenta
			</p>
		{/if}
	</FilterBar>

	<noscript>
		<form method="GET" class="plain">
			{#if data.filters.q}<input type="hidden" name="q" value={data.filters.q} />{/if}
			{#if data.filters.currency && data.lockedCurrency === null}
				<input type="hidden" name="currency" value={data.filters.currency} />
			{/if}
			{@render fields()}
			<button type="submit">Aplicar filtros</button>
		</form>
	</noscript>

	<BottomDrawer title="Filtros" bind:open={filtersOpen}>
		<form
			method="GET"
			class="drawer-form"
			bind:this={drawerForm}
			onchange={() => drawerForm?.requestSubmit()}
			onsubmit={applyFilters}
		>
			{#if data.filters.q}<input type="hidden" name="q" value={data.filters.q} />{/if}
			{#if data.filters.currency && data.lockedCurrency === null}
				<input type="hidden" name="currency" value={data.filters.currency} />
			{/if}
			{@render fields()}
			{#if filterCount > 0}
				<Button type="button" variant="secondary" block onclick={clearFilters}>
					Limpiar filtros
				</Button>
			{/if}
		</form>
	</BottomDrawer>

	{#if data.groups.length === 0}
		{#if data.page > 1}
			<EmptyState icon="search">Sin más movimientos.</EmptyState>
			<div class="empty-action">
				<Button href={resolve(`/movements?${firstPageQuery}`)} variant="secondary">
					Ir a la primera página
				</Button>
			</div>
		{:else if data.activeCount === 0}
			<EmptyState icon="movements">Sin movimientos.</EmptyState>
			<div class="empty-action">
				<Button href={resolve('/movements/new')}>Nuevo movimiento</Button>
			</div>
		{:else}
			<EmptyState icon="search">Sin resultados.</EmptyState>
			<div class="empty-action">
				<Button href={resolve('/movements')} variant="secondary">Limpiar filtros</Button>
			</div>
		{/if}
	{:else}
		<div class="groups" aria-busy={navigating.to !== null}>
			{#each data.groups as g (g.day)}
				<section aria-labelledby="day-{g.day}">
					<h2 id="day-{g.day}">{g.heading}</h2>
					<ul class="list-card">
						{#each g.items as m (m.id)}
							<li>
								<MovementRow
									m={{
										...m,
										subtitle: `${
											m.type === 'transfer'
												? `${m.accountName} → ${m.destinationAccountName}`
												: m.accountName
										}${m.categoryName ? ` · ${m.categoryName}` : ''}`
									}}
								/>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>

		{#if data.page > 1 || data.hasNext}
			<nav class="pager" aria-label="Paginación">
				{#if data.page > 1}
					<Button href={resolve(`/movements?${pageQuery(data.page - 1)}`)} variant="secondary">
						<ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />Más recientes
					</Button>
				{/if}
				{#if data.hasNext}
					<Button href={resolve(`/movements?${pageQuery(data.page + 1)}`)} variant="secondary">
						Más antiguos<ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
					</Button>
				{/if}
			</nav>
		{/if}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.filters-btn {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 2.75rem;
		padding: 0 var(--space-4);
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.filters-btn.active {
		border-color: var(--text);
	}

	/* Active-filter count: text in an inverted fill, never a colour signal. */
	.count {
		display: grid;
		place-items: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 var(--space-2);
		border-radius: var(--radius-pill);
		background: var(--text);
		color: var(--bg);
		font-size: var(--font-size-xs);
		font-weight: 600;
	}

	.lock {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	/* Drawer content is portaled, so the form needs its own layout (scoped styles still apply to its own nodes). */
	.drawer-form,
	.plain {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	/* Rows of one card, like the movement form. */
	.group {
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.group > :global(* + *) {
		border-top: 1px solid var(--border);
	}

	.date-row {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-base);
	}

	.date-row input {
		width: auto;
		min-width: 0;
		border: 0;
		background: transparent;
		text-align: right;
	}

	.groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		transition: opacity 0.15s ease;
	}

	.groups[aria-busy='true'] {
		opacity: 0.5;
	}

	h2 {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-muted);
		padding-inline: var(--space-4);
		margin-bottom: var(--space-2);
	}

	.empty-action {
		display: flex;
		justify-content: center;
	}

	.pager {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.pager :global(.btn) {
		min-height: 3rem;
		gap: var(--space-1);
	}

	.pager :global(.btn:only-child) {
		grid-column: 1 / 3;
	}
</style>
