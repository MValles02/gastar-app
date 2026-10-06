<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import CurrencyTabs from '$lib/components/CurrencyTabs.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatMoney } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const money = (c: number) => formatMoney(c, data.currency);
	const SLICE_COLORS = [
		'var(--swatch-green)',
		'var(--swatch-orange)',
		'var(--swatch-blue)',
		'var(--swatch-plum)'
	];
	const sliceColor = (id: string, i: number) =>
		id === 'other' ? 'var(--transfer)' : SLICE_COLORS[i];
</script>

<svelte:head>
	<title>Reportes · Gastar</title>
</svelte:head>

<PageHeader title="Reportes" />

<div class="page">
	<CurrencyTabs value={data.currency} />

	<nav class="nav" aria-label="Mes">
		<a class="arrow" href={resolve(`/reports?month=${data.nav.prev}`)} aria-label="Mes anterior">
			<Icon name="chevron-left" />
		</a>
		<p class="month-label">{data.nav.label}</p>
		{#if data.nav.isCurrent}
			<span class="arrow disabled" role="link" aria-disabled="true" aria-label="Mes siguiente">
				<Icon name="chevron-right" />
			</span>
		{:else}
			<a class="arrow" href={resolve(`/reports?month=${data.nav.next}`)} aria-label="Mes siguiente">
				<Icon name="chevron-right" />
			</a>
		{/if}
	</nav>

	{#if !data.hasCurrency}
		<EmptyState icon="accounts">No tenés cuentas en {data.currency}.</EmptyState>
		<div class="empty-action">
			<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
		</div>
	{:else}
		{@const max = Math.max(1, ...data.bars.flatMap((b) => [b.income, b.outcome]))}
		<section aria-label="Totales del mes">
			<Card>
				<dl class="totals">
					<div>
						<dt>Ingresos</dt>
						<dd><Money cents={data.income} currency={data.currency} kind="income" /></dd>
					</div>
					<div>
						<dt>Gastos</dt>
						<dd><Money cents={data.outcome} currency={data.currency} /></dd>
					</div>
					<div>
						<dt>Resultado</dt>
						<dd>
							<Money
								cents={data.net}
								currency={data.currency}
								kind={data.net > 0 ? 'income' : 'plain'}
							/>
						</dd>
					</div>
				</dl>
			</Card>
		</section>

		<section aria-labelledby="flow-heading">
			<h2 id="flow-heading">Ingresos y gastos, 6 meses</h2>
			<Card>
				<ul class="bars">
					{#each data.bars as b (b.ym)}
						<li class:current={b.ym === data.nav.ym}>
							<a
								href={resolve(`/reports?month=${b.ym}`)}
								aria-current={b.ym === data.nav.ym ? 'true' : undefined}
								aria-label="{b.name}: ingresos {money(b.income)}, gastos {money(b.outcome)}"
							>
								<span class="cols" aria-hidden="true">
									<span class="bar in" style:height="{(b.income / max) * 100}%"></span>
									<span class="bar out" style:height="{(b.outcome / max) * 100}%"></span>
								</span>
								<span class="bar-label" aria-hidden="true">{b.label}</span>
							</a>
						</li>
					{/each}
				</ul>
				<p class="legend" aria-hidden="true">
					<span><i class="in"></i>Ingresos</span>
					<span><i class="out"></i>Gastos</span>
				</p>
			</Card>
		</section>

		<section aria-labelledby="cat-heading">
			<h2 id="cat-heading">Gastos por categoría</h2>
			{#if data.slices.length === 0}
				<p class="muted">No hay gastos con categoría en {data.nav.label.toLowerCase()}.</p>
			{:else}
				<Card>
					<div class="donut-card">
						<svg viewBox="0 0 42 42" class="donut" aria-hidden="true">
							{#each data.slices as s, i (s.id)}
								{@const offset = data.slices.slice(0, i).reduce((a, x) => a + x.share * 100, 0)}
								<circle
									cx="21"
									cy="21"
									r="15.915"
									fill="none"
									stroke={sliceColor(s.id, i)}
									stroke-width="6"
									pathLength="100"
									stroke-dasharray="{s.share * 100} {100 - s.share * 100}"
									stroke-dashoffset={25 - offset}
								/>
							{/each}
						</svg>
						<ul class="slices">
							{#each data.slices as s, i (s.id)}
								<li>
									<i style:background={sliceColor(s.id, i)} aria-hidden="true"></i>
									<span class="name">{s.name}</span>
									<span class="pct">{s.percent} %</span>
									<span class="amt"><Money cents={s.amount} currency={data.currency} /></span>
								</li>
							{/each}
						</ul>
					</div>
				</Card>
			{/if}
		</section>

		<section class="facts" aria-label="Datos del mes">
			<Card>
				<p class="label">Promedio diario</p>
				<p class="fact"><Money cents={data.dailyAverage} currency={data.currency} /></p>
				<p class="label">en {data.days} {data.days === 1 ? 'día' : 'días'}</p>
			</Card>
			{#if data.biggest}
				<a class="fact-link" href={resolve(`/movements/${data.biggest.id}`)}>
					<Card>
						<p class="label">Gasto más grande</p>
						<p class="fact"><Money cents={data.biggest.amount} currency={data.currency} /></p>
						<p class="label ellipsis">{data.biggest.description} · {data.biggest.date}</p>
					</Card>
				</a>
			{/if}
		</section>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.empty-action {
		display: flex;
		justify-content: center;
	}

	h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
		margin-bottom: var(--space-2);
	}

	.muted,
	.label {
		color: var(--text-muted);
	}

	.label {
		font-size: var(--font-size-sm);
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.month-label {
		font-weight: 500;
	}

	.arrow {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: var(--radius-pill);
		color: var(--text);
		transition: background-color 0.15s ease;
	}

	.arrow.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	a.arrow:hover {
		background: color-mix(in srgb, var(--primary) 8%, transparent);
	}

	.totals {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		margin: 0;
	}

	.totals > div {
		flex: 1 1 6rem;
		min-width: 0;
	}

	.totals dt {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.totals dd {
		margin: 0;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	/* Bleeds to the card edges so each month link stays at least 2.75rem wide at 320px. */
	.bars {
		list-style: none;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(2.75rem, 1fr));
		margin: 0 calc(-1 * var(--space-4));
		padding: 0;
	}

	.bars li {
		height: 9rem;
	}

	.bars a {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: var(--space-1);
		text-decoration: none;
		color: var(--text-muted);
	}

	.cols {
		flex: 1;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 3px;
	}

	.bar {
		width: 30%;
		min-height: 2px;
		border-radius: 3px 3px 0 0;
	}

	.in {
		background: var(--positive);
	}

	.out {
		background: var(--text-muted);
	}

	.bar-label {
		font-size: var(--font-size-xs);
		text-align: center;
	}

	.current .bar-label {
		color: var(--text);
		font-weight: 600;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin-top: var(--space-3);
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.legend i,
	.slices i {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}

	.donut-card {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: var(--space-4);
	}

	.donut {
		flex: none;
		width: 7rem;
		height: 7rem;
	}

	.slices {
		flex: 1 1 10rem;
		min-width: 0;
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
	}

	.slices li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		column-gap: var(--space-2);
	}

	.name {
		overflow-wrap: anywhere;
	}

	.pct {
		color: var(--text-muted);
		font-size: var(--font-size-xs);
	}

	.amt {
		grid-column: 2 / -1;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
		gap: var(--space-3);
	}

	.fact-link {
		display: block;
		min-width: 0;
		color: inherit;
		text-decoration: none;
		border-radius: var(--radius-card);
	}

	.fact {
		margin: var(--space-1) 0;
		font-size: var(--font-size-lg);
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.ellipsis {
		overflow-wrap: anywhere;
	}
</style>
