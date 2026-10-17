<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import CurrencyTabs from '$lib/components/CurrencyTabs.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import MonthNav from '$lib/components/MonthNav.svelte';
	import Money from '$lib/components/Money.svelte';
	import CardEyebrow from '$lib/components/CardEyebrow.svelte';
	import HeroAmount from '$lib/components/HeroAmount.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatMoney } from '$lib/money';
	import { swatchVar } from '$lib/appearance';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const money = (c: number) => formatMoney(c, data.currency);
	// Spending is negated so Money shows it as an outcome (red); zero stays neutral.
	const neg = (c: number) => (c === 0 ? 0 : -c);
	// The category's own swatch, as in the Categorías list (no colour = the badge default); "Otros" is neutral.
	const sliceColor = (s: { id: string; color: string | null }) =>
		s.id === 'other' ? 'var(--text-muted)' : swatchVar(s.color);
</script>

{#snippet sliceRow(s: {
	id: string;
	name: string;
	percent: number;
	amount: number;
	color: string | null;
})}
	<i style:background={sliceColor(s)} aria-hidden="true"></i>
	<span class="name">{s.name}</span>
	<span class="pct">{s.percent} %</span>
	<span class="amt"><Money cents={s.amount} currency={data.currency} /></span>
{/snippet}

<svelte:head>
	<title>Reportes · Gastar</title>
</svelte:head>

<PageHeader title="Reportes" />

<div class="page">
	<CurrencyTabs value={data.currency} />

	<div class="month-nav">
		<MonthNav
			label={data.nav.label}
			prevHref={resolve(`/reports?month=${data.nav.prev}`)}
			nextHref={data.nav.isCurrent ? null : resolve(`/reports?month=${data.nav.next}`)}
		/>
	</div>

	{#if !data.hasCurrency}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon"><Icon name="accounts" size="1rem" /></Empty.Media>
				<Empty.Description>Sin cuentas en {data.currency}.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
		<div class="empty-action">
			<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
		</div>
	{:else}
		{@const max = Math.max(1, ...data.bars.flatMap((b) => [b.income, b.outcome]))}
		<section aria-label="Totales del mes">
			<Card.Root class="gap-0 overflow-hidden py-0">
				<dl class="totals">
					<div class="box">
						<CardEyebrow as="dt">Resultado</CardEyebrow>
						<HeroAmount as="dd" cents={data.net} currency={data.currency} tone="flow" />
					</div>
					<div class="kv">
						<dt class="k">Ingresos</dt>
						<dd class="am">
							<Money cents={data.income} currency={data.currency} tone="flow" direction="income" />
						</dd>
					</div>
					<div class="kv">
						<dt class="k">Gastos</dt>
						<dd class="am">
							<Money
								cents={neg(data.outcome)}
								currency={data.currency}
								tone="flow"
								direction="outcome"
							/>
						</dd>
					</div>
				</dl>
			</Card.Root>
		</section>

		<section aria-labelledby="flow-heading">
			<h2 id="flow-heading">6 meses</h2>
			<Card.Root>
				<Card.Content>
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
				</Card.Content>
			</Card.Root>
		</section>

		<section aria-labelledby="cat-heading">
			<h2 id="cat-heading">Categorías</h2>
			{#if data.slices.length === 0}
				<Card.Root class="gap-0 overflow-hidden py-0">
					<p class="empty-inline">No hay gastos con categoría en {data.nav.label.toLowerCase()}.</p>
				</Card.Root>
			{:else}
				<Card.Root class="gap-0 overflow-hidden py-0">
					<svg viewBox="0 0 42 42" class="donut" aria-hidden="true">
						{#each data.slices as s, i (s.id)}
							{@const offset = data.slices.slice(0, i).reduce((a, x) => a + x.share * 100, 0)}
							{@const len = s.share * 100 - (data.slices.length > 1 ? 0.6 : 0)}
							<circle
								cx="21"
								cy="21"
								r="17.6"
								fill="none"
								stroke={sliceColor(s)}
								stroke-width="6.8"
								pathLength="100"
								stroke-dasharray="{len} {100 - len}"
								stroke-dashoffset={25 - offset}
							/>
						{/each}
					</svg>
					<ul class="slices">
						{#each data.slices as s (s.id)}
							<li>
								{#if s.id === 'other'}
									<div class="row">{@render sliceRow(s)}</div>
								{:else}
									<a class="row" href={resolve(`/categories/${s.id}?month=${data.nav.ym}`)}>
										{@render sliceRow(s)}
									</a>
								{/if}
							</li>
						{/each}
					</ul>
				</Card.Root>
			{/if}
		</section>

		<section class="facts" class:one={!data.biggest} aria-label="Datos del mes">
			<Card.Root>
				<Card.Content>
					<div class="fact-card">
						<CardEyebrow>Por día</CardEyebrow>
						<p class="fact"><Money cents={data.dailyAverage} currency={data.currency} /></p>
						<p class="label">{data.days} {data.days === 1 ? 'día' : 'días'}</p>
					</div>
				</Card.Content>
			</Card.Root>
			{#if data.biggest}
				<a class="fact-link" href={resolve(`/movements/${data.biggest.id}`)}>
					<Card.Root>
						<Card.Content>
							<div class="fact-card">
								<CardEyebrow>Gasto más grande</CardEyebrow>
								<Icon name="chevron-right" size="1rem" />
								<p class="fact">
									<Money cents={neg(data.biggest.amount)} currency={data.currency} />
								</p>
								<p class="label">{data.biggest.description} · {data.biggest.date}</p>
							</div>
						</Card.Content>
					</Card.Root>
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

	.label {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.month-nav {
		margin: calc(-1 * var(--space-2));
	}

	/* Resultado card: same shape as Disponible on Inicio and Plan. */
	.totals {
		margin: 0;
	}

	.box {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 1.25rem 1.25rem var(--space-4);
		/* Inherited by the hero amount. */
		overflow-wrap: anywhere;
	}

	.kv {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0 var(--space-3);
		min-height: 3rem;
		padding: 0 1.25rem;
		border-top: 1px solid var(--border);
	}

	.k {
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text-muted);
	}

	.am {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}

	/* Bleeds to the card edges so each month link stays at least 2.75rem wide at 320px. */
	.bars {
		list-style: none;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(var(--tap-target), 1fr));
		margin: 0 calc(-1 * var(--space-4));
		padding: 0;
	}

	.bars a {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--tap-target);
		padding: var(--space-2) 0 0.375rem;
		border-radius: 0.75rem;
		text-decoration: none;
		color: var(--text-muted);
		transition: background-color 0.12s ease;
	}

	.bars a:active {
		background: var(--muted);
	}

	.cols {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 4px;
		height: 7.5rem;
		opacity: 0.38;
	}

	.current .cols {
		opacity: 1;
	}

	.bar {
		width: 10px;
		min-height: 2px;
		border-radius: 4px 4px 1px 1px;
	}

	.in {
		background: var(--positive);
	}

	.out {
		background: var(--negative);
	}

	.bar-label {
		font-size: var(--font-size-xs);
		font-weight: 500;
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
		margin-top: var(--space-1);
		font-size: var(--font-size-xs);
		font-weight: 500;
		color: var(--text-muted);
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.legend i,
	.slices i {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.slices i {
		width: 10px;
		height: 10px;
	}

	.donut {
		display: block;
		width: 8.5rem;
		height: 8.5rem;
		margin: 1.25rem auto var(--space-2);
	}

	.slices {
		list-style: none;
		margin: 0;
		padding: 0 var(--space-4) 0.25rem;
	}

	.row {
		display: grid;
		grid-template-columns: 10px minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 0.625rem;
		min-height: 3rem;
		color: inherit;
		text-decoration: none;
	}

	a.row:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: -2px;
		border-radius: 0.5rem;
	}

	a.row:active {
		background: var(--muted);
	}

	.slices li + li {
		border-top: 1px solid var(--border);
	}

	.name {
		min-width: 0;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pct {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		text-align: right;
		white-space: nowrap;
	}

	.amt {
		font-family: var(--font-display);
		text-align: right;
		overflow-wrap: anywhere;
	}

	.empty-inline {
		display: flex;
		align-items: center;
		min-height: 3.5rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.facts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
	}

	.facts.one {
		grid-template-columns: minmax(0, 1fr);
	}

	.fact-link {
		display: block;
		min-width: 0;
		color: inherit;
		text-decoration: none;
		border-radius: var(--radius-card);
	}

	.fact-link:active :global(.card) {
		background: var(--muted);
	}

	.fact-card {
		container-type: inline-size;
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.fact-card :global(svg) {
		position: absolute;
		top: -2px;
		right: -4px;
		color: var(--border-strong);
	}

	/* Scales with the card so amounts never break; both cards share the size. */
	.fact-card :global(.eyebrow) {
		padding-right: 1.25rem;
		font-size: clamp(0.625rem, 7cqi, var(--font-size-xs));
		white-space: nowrap;
	}

	.fact {
		margin-top: 2px;
		font-family: var(--font-display);
		font-size: clamp(0.875rem, 17cqi, 1.5rem);
		font-weight: 500;
		letter-spacing: -0.01em;
		line-height: 1.2;
		white-space: nowrap;
	}

	@media (max-width: 21rem) {
		.facts {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
