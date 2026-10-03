<script lang="ts">
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import Button from '$lib/components/Button.svelte';
	import DateTimePicker from '$lib/components/DateTimePicker.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import { formatMoney } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let type = $derived<string>(data.filters.type);
	let account = $derived<string>(data.filters.account);
	let category = $derived<string>(data.filters.category);
	let from = $derived<string>(data.filters.from);
	let to = $derived<string>(data.filters.to);

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
</script>

<svelte:head>
	<title>Movimientos · Gastar</title>
</svelte:head>

<PageHeader title="Movimientos">
	{#snippet action()}
		<Button href={resolve('/movements/new')}>Nuevo movimiento</Button>
	{/snippet}
</PageHeader>

<div class="page">
	<FilterBar q={data.filters.q} label="Buscar movimientos" placeholder="Buscar movimientos">
		<details open={data.activeCount > 0}>
			<summary>Filtros ({data.activeCount})</summary>
			<div class="filters">
				<SegmentedControl name="type" options={typeOptions} bind:value={type} />
				<OptionPicker
					name="account"
					legend="Cuenta"
					title="Elegí una cuenta"
					items={data.accounts}
					bind:value={account}
					placeholder="Todas las cuentas"
				>
					{#snippet empty()}{/snippet}
				</OptionPicker>
				<OptionPicker
					name="category"
					legend="Categoría"
					title="Elegí una categoría"
					items={data.categories}
					bind:value={category}
					placeholder="Todas las categorías"
				>
					{#snippet empty()}{/snippet}
				</OptionPicker>
				<DateTimePicker name="from" mode="date" label="Desde" now={data.now} bind:value={from} />
				<DateTimePicker name="to" mode="date" label="Hasta" now={data.now} bind:value={to} />
				<a class="clear" href={resolve('/movements')}>Limpiar filtros</a>
			</div>
		</details>
	</FilterBar>

	{#if data.groups.length === 0}
		{#if data.page > 1}
			<EmptyState icon="search">No hay más movimientos en esta página.</EmptyState>
			<div class="empty-action">
				<a class="clear" href={resolve(`/movements?${firstPageQuery}`)}
					>Volver a la primera página</a
				>
			</div>
		{:else if data.activeCount === 0}
			<EmptyState icon="movements">Todavía no tenés movimientos.</EmptyState>
			<div class="empty-action">
				<Button href={resolve('/movements/new')}>Nuevo movimiento</Button>
			</div>
		{:else}
			<EmptyState icon="search">No hay movimientos que coincidan con los filtros.</EmptyState>
			<div class="empty-action">
				<a class="clear" href={resolve('/movements')}>Limpiar filtros</a>
			</div>
		{/if}
	{:else}
		{#each data.groups as g (g.day)}
			<section aria-labelledby="day-{g.day}">
				<h2 id="day-{g.day}">{g.heading}</h2>
				<ul class="list-card">
					{#each g.items as m (m.id)}
						<li>
							<ListRow href={resolve(`/movements/${m.id}`)}>
								{#snippet title()}{m.description}{/snippet}
								{#snippet subtitle()}{m.type === 'transfer'
										? `${m.accountName} → ${m.destinationAccountName}`
										: m.accountName}{m.categoryName ? ` · ${m.categoryName}` : ''}{/snippet}
								{#snippet trailing()}
									<span class="amount {m.sign === 'neutral' ? 'transfer' : m.sign}">
										{formatMoney(m.amount, m.currency, {
											sign: m.sign === 'positive' ? 'always' : 'auto'
										})}
									</span>
								{/snippet}
							</ListRow>
						</li>
					{/each}
				</ul>
			</section>
		{/each}

		{#if data.page > 1 || data.hasNext}
			<nav class="pager" aria-label="Paginación">
				{#if data.page > 1}
					<a href={resolve(`/movements?${pageQuery(data.page - 1)}`)}>Más recientes</a>
				{/if}
				{#if data.hasNext}
					<a class="next" href={resolve(`/movements?${pageQuery(data.page + 1)}`)}>Más antiguos</a>
				{/if}
			</nav>
		{/if}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	summary {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0 var(--space-4);
		font-weight: 500;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		cursor: pointer;
	}

	details[open] > summary {
		margin-bottom: var(--space-3);
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
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

	.clear,
	.pager a {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		font-weight: 500;
		color: var(--text);
		text-decoration: underline;
	}

	.pager {
		display: flex;
		justify-content: space-between;
	}

	.next {
		margin-left: auto;
	}

	.amount {
		white-space: normal;
		overflow-wrap: anywhere;
		font-weight: 500;
	}

	.positive {
		color: var(--positive);
	}

	.negative {
		color: var(--negative);
	}

	.transfer {
		color: var(--transfer);
	}
</style>
