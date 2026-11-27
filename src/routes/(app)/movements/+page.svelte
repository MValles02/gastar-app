<script lang="ts">
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import { untrack } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { fade, recordOffsets, slide } from '#lib/motion.ts';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '#lib/components/ui/button/index.js';
	import DateRangePicker from '#lib/components/pickers/DateRangePicker.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import FilterBar from '#lib/components/FilterBar.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import MovementFiltersDrawer from '#lib/components/movements/MovementFiltersDrawer.svelte';
	import Amount from '#lib/components/base/Amount.svelte';
	import MovementRow from '#lib/components/movements/MovementRow.svelte';
	import OptionPicker from '#lib/components/pickers/OptionPicker.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import TabBand from '#lib/components/TabBand.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import { openShallow } from '#lib/open-shallow.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// A literal: Svelte trims whitespace around inline text in blocks.
	const CURRENCY_SEP = ' · ';

	let filtersOpen = $state(false);

	// The month headers stick under the page header, which is only sticky on tall viewports.
	let barHeight = $state(0);
	let header = $state<HTMLElement>();
	$effect(() => {
		const bar = header;
		if (!bar) return;
		const measure = () =>
			(barHeight = getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(bar);
		return () => ro.disconnect();
	});

	let type = $derived<string>(data.filters.type);
	// The drawer edits several; the in-page controls show the first.
	let account = $derived<string>(data.accountIds[0] ?? '');
	let category = $derived<string>(data.categoryIds[0] ?? '');
	let from = $derived<string>(data.filters.from);
	let to = $derived<string>(data.filters.to);

	const typeOptions = [
		{ value: '', label: 'Todos' },
		{ value: 'income', label: 'Ingresos' },
		{ value: 'outcome', label: 'Gastos' },
		{ value: 'transfer', label: 'Transf.' }
	];

	const filterParams = () => {
		// SvelteURLSearchParams: required by the svelte/prefer-svelte-reactivity lint rule.
		const sp = new SvelteURLSearchParams();
		for (const [k, v] of Object.entries(data.filters)) if (v) sp.set(k, v);
		if (data.allDates) sp.set('all', '1');
		for (const id of data.accountIds) sp.append('account', id);
		for (const id of data.categoryIds) sp.append('category', id);
		return sp;
	};
	const pageQuery = (page: number) => {
		const sp = filterParams();
		sp.set('page', String(page));
		return sp.toString();
	};
	const firstPageQuery = $derived(filterParams().toString());

	// A new filter or page (a tap) fades the list in. A search (typed) updates it in place with no
	// motion. A refresh of the same address (a delete, its undo, pull-to-refresh) slides the rows
	// that moved, from offsets recorded right before the update, and fades in the ones that return.
	const listKey = $derived(
		JSON.stringify([
			{ ...data.filters, q: '' },
			data.allDates,
			data.accountIds,
			data.categoryIds,
			data.page
		])
	);
	let groups = $state<HTMLElement>();
	let lastSearch: string | undefined;
	let inPlace = $state(false);
	$effect.pre(() => {
		void data.months;
		untrack(() => {
			inPlace = page.url.search === lastSearch;
			lastSearch = page.url.search;
			recordOffsets(inPlace ? groups : undefined);
		});
	});

	// The search term is not a filter: the badge and Limpiar count only the drawer filters.
	const filterCount = $derived(data.activeCount - (data.filters.q ? 1 : 0));
</script>

<svelte:head>
	<title>Movimientos · Gastar</title>
</svelte:head>

<PageHeader title="Movimientos" tone="primary" bind:ref={header} />

{#snippet fields(submit: () => void)}
	<span id="type-label" class="visually-hidden">Tipo</span>
	<SegmentedControl
		name="type"
		options={typeOptions}
		bind:value={type}
		labelledby="type-label"
		onchange={submit}
	/>
	<div class="group">
		<OptionPicker
			name="account"
			legend="Cuenta"
			title="Cuenta"
			items={data.accounts}
			bind:value={account}
			placeholder="Todas"
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
		>
			{#snippet empty()}{/snippet}
		</OptionPicker>
		<DateRangePicker bind:from bind:to />
	</div>
{/snippet}

<TabBand overlap={false}>
	<FilterBar
		q={data.filters.q}
		label="Buscar"
		placeholder="Buscar"
		active={filterCount}
		filters={fields}
		onfilters={() => (filtersOpen = true)}
		tone="primary"
	/>
</TabBand>

<div class="page">
	<MovementFiltersDrawer
		bind:open={filtersOpen}
		filters={data.filters}
		accountIds={data.accountIds}
		categoryIds={data.categoryIds}
		accounts={data.accounts}
		categories={data.categories}
	/>

	{#key listKey}
		<div class="list" in:fade>
			{#if data.months.length === 0}
				{#if data.page > 1}
					<EmptyState icon="search" description="Sin más movimientos.">
						<Button href={resolve(`movements?${firstPageQuery}`)} variant="outline">
							Ir a la primera página
						</Button>
					</EmptyState>
				{:else if data.activeCount === 0}
					<EmptyState icon="movements" description="Sin movimientos.">
						<Button
							href={resolve('movements/new')}
							onclick={(e) => openShallow(e, resolve('movements/new'), 'newMovement')}
							>Nuevo movimiento</Button
						>
					</EmptyState>
				{:else}
					<EmptyState icon="search" description="Sin resultados.">
						<Button href={resolve('movements')} variant="outline">Limpiar filtros</Button>
					</EmptyState>
				{/if}
			{:else}
				{#if data.summary}
					<p class="summary" role="status">
						{data.summary.count}
						{data.summary.count === 1 ? 'movimiento' : 'movimientos'}
					</p>
				{/if}
				<div
					class="groups"
					bind:this={groups}
					style:--month-top="{barHeight}px"
					aria-busy={navigating.to !== null}
				>
					{#each data.months as mo (mo.ym)}
						<section class="month" aria-labelledby="month-{mo.ym}" data-slide animate:slide>
							<h2 id="month-{mo.ym}">{mo.label}</h2>
							{#each mo.days as g (g.day)}
								<section
									class="day"
									aria-labelledby="day-{g.day}"
									data-slide
									animate:slide
									in:fade={{ skip: !inPlace }}
								>
									<div class="day-head">
										<h3 id="day-{g.day}">{g.heading}</h3>
										{#if g.spend.length}
											<span class="day-total">
												<span class="visually-hidden">Gastos del día: </span>
												{#each g.spend as s, i (s.currency)}
													{#if i > 0}{CURRENCY_SEP}{/if}
													<Amount cents={s.cents} currency={s.currency} />
												{/each}
											</span>
										{/if}
									</div>
									<ListCard class="relative">
										{#each g.items as m (m.id)}
											<div data-slide animate:slide in:fade={{ skip: !inPlace }}>
												<MovementRow {m} />
											</div>
										{/each}
									</ListCard>
								</section>
							{/each}
						</section>
					{/each}
				</div>

				{#if data.page > 1 || data.hasNext}
					<nav class="pager" aria-label="Paginación">
						{#if data.page > 1}
							<Button href={resolve(`movements?${pageQuery(data.page - 1)}`)} variant="outline">
								<ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />Más recientes
							</Button>
						{/if}
						{#if data.hasNext}
							<Button href={resolve(`movements?${pageQuery(data.page + 1)}`)} variant="outline">
								Más antiguos<ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
							</Button>
						{/if}
					</nav>
				{/if}
			{/if}
		</div>
	{/key}
</div>

<style>
	.page {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	/* Rows of one card, like the movement form. */
	.group {
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--card-edge);
		border-radius: var(--radius-card);
	}

	.list,
	.groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	/* Offset parents for the row slide (motion.ts `slide`). */
	.groups,
	.month,
	.day {
		position: relative;
	}

	.groups {
		transition: opacity var(--dur-base) var(--ease-out);
	}

	.groups[aria-busy='true'] {
		opacity: 0.5;
	}

	.summary {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.month {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	/* Sticks under the page header; the page background hides the rows scrolling beneath it. */
	h2 {
		position: sticky;
		top: var(--month-top);
		z-index: 8;
		margin-inline: calc(var(--gutter) * -1);
		padding: var(--space-2) var(--gutter);
		background: var(--bg);
		font-size: var(--font-size-base);
		font-weight: 600;
	}

	.day-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
		padding-inline: var(--space-4);
		margin-bottom: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-muted);
	}

	h3 {
		font-size: inherit;
		font-weight: inherit;
	}

	.day-total {
		text-align: right;
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
