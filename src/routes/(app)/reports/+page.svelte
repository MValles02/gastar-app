<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import CurrencyTabs from '#lib/components/CurrencyTabs.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import MonthNav from '#lib/components/MonthNav.svelte';
	import Money from '#lib/components/Money.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import Meter from '#lib/components/Meter.svelte';
	import SectionHeader from '#lib/components/SectionHeader.svelte';
	import CardEyebrow from '#lib/components/CardEyebrow.svelte';
	import HeroAmount from '#lib/components/HeroAmount.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import TabBand from '#lib/components/TabBand.svelte';
	import { CURRENCY_NAME, formatMoney } from '#lib/money.ts';
	import { markReplace } from '#lib/nav-stack.svelte.ts';
	import { openShallow } from '#lib/open-shallow.ts';
	import { swatchVar, toSwatchKey } from '#lib/appearance.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// The month starts with the totals card (which overlaps the band) only when it has movements.
	const hasMovements = $derived(data.bars?.some((b) => b.income !== 0 || b.outcome !== 0) ?? false);

	const money = (c: number) => formatMoney(c, data.currency);
	// Spending is negated so Money shows it as an outcome (red); zero stays neutral.
	const neg = (c: number) => (c === 0 ? 0 : -c);
	// The category's own swatch, as in the Categorías list (no colour = the badge default); "Otros" is neutral.
	const sliceColor = (s: { id: string; color: string | null }) =>
		s.id === 'other' ? 'var(--text-muted)' : swatchVar(s.color);
</script>

<svelte:head>
	<title>Reportes · Gastar</title>
</svelte:head>

<PageHeader title="Reportes" tone="primary" />

<TabBand overlap={data.hasCurrency && hasMovements}>
	<CurrencyTabs value={data.currency} variant="pills" tone="primary" />
	{#if data.hasCurrency}
		<div class="month-nav">
			<MonthNav
				label={data.nav.label}
				prevHref={resolve(`reports?month=${data.nav.prev}`)}
				nextHref={data.nav.isCurrent ? null : resolve(`reports?month=${data.nav.next}`)}
			/>
		</div>
	{/if}
</TabBand>

<div class="page">
	{#if !data.hasCurrency}
		<EmptyState icon="accounts" description="No tenés cuentas en {CURRENCY_NAME[data.currency]}.">
			<Button href={resolve('accounts/new')}>Crear cuenta</Button>
		</EmptyState>
	{:else}
		{@const max = Math.max(1, ...data.bars.flatMap((b) => [b.income, b.outcome]))}
		{#if !hasMovements}
			<EmptyState icon="chart" description="Sin movimientos en {CURRENCY_NAME[data.currency]}." />
		{:else}
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
								<Money
									cents={data.income}
									currency={data.currency}
									tone="flow"
									direction="income"
								/>
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
				<SectionHeader id="flow-heading" title="Últimos 6 meses" />
				<Card.Root>
					<Card.Content>
						<ul class="bars">
							{#each data.bars as b (b.ym)}
								<li class:current={b.ym === data.nav.ym}>
									<a
										data-press
										href={resolve(`reports?month=${b.ym}`)}
										data-sveltekit-replacestate
										onclick={markReplace}
										aria-current={b.ym === data.nav.ym ? 'true' : undefined}
										aria-label="{b.label}: ingresos {money(b.income)}, gastos {money(b.outcome)}"
									>
										<span class="cols" aria-hidden="true">
											{#if b.income > 0}<span class="slot"
													><span class="bar in" style:--h="{(b.income / max) * 100}%"></span></span
												>{/if}{#if b.outcome > 0}<span class="slot"
													><span class="bar out" style:--h="{(b.outcome / max) * 100}%"
													></span></span
												>{/if}
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
				<SectionHeader id="cat-heading" title="Gastos por categoría" />
				{#if data.slices.length === 0}
					<Card.Root class="gap-0 overflow-hidden py-0">
						<p class="empty-card">No hay gastos.</p>
					</Card.Root>
				{:else}
					<ListCard>
						{#each data.slices as s (s.id)}
							{#snippet sliceValue()}
								<span class="pct">{s.percent}%</span>
								<Money cents={s.amount} currency={data.currency} tone="flow" direction="outcome" />
							{/snippet}
							{#snippet sliceFooter()}
								<Meter percent={s.percent} color={sliceColor(s)} />
							{/snippet}
							<ListRow
								href={s.id === 'other'
									? undefined
									: resolve(`categories/${s.id}?month=${data.nav.ym}`)}
								lead={s.id === 'other'
									? { icon: 'categories', color: null }
									: {
											icon: s.icon ?? undefined,
											letter: s.icon ? undefined : s.name.charAt(0).toUpperCase(),
											color: toSwatchKey(s.color)
										}}
								onclick={(e) =>
									openShallow(e, resolve(`categories/${s.id}?month=${data.nav.ym}`), 'category')}
								title={s.name}
								value={sliceValue}
								footer={sliceFooter}
							/>
						{/each}
					</ListCard>
				{/if}
			</section>

			{#if data.slices.length > 0 || data.biggest}
				<section
					class="facts"
					class:single={data.slices.length === 0 || !data.biggest}
					aria-label="Datos del mes"
				>
					{#if data.slices.length > 0}
						<Card.Root>
							<Card.Content>
								<div class="fact-card">
									<CardEyebrow>Por día</CardEyebrow>
									<p class="fact"><Money cents={data.dailyAverage} currency={data.currency} /></p>
									<p class="label">{data.days} {data.days === 1 ? 'día' : 'días'}</p>
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
					{#if data.biggest}
						<a class="fact-link" data-press href={resolve(`movements/${data.biggest.id}`)}>
							<Card.Root>
								<Card.Content>
									<div class="fact-card">
										<CardEyebrow>Gasto más grande</CardEyebrow>
										<Icon name="chevron-right" size="1rem" />
										<p class="fact">
											<Money
												cents={neg(data.biggest.amount)}
												currency={data.currency}
												tone="flow"
												direction="outcome"
											/>
										</p>
										<p class="label">{data.biggest.description} · {data.biggest.date}</p>
									</div>
								</Card.Content>
							</Card.Root>
						</a>
					{/if}
				</section>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.page {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.label {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	/* On the band: the arrows and label take the on-primary ink. */
	.month-nav {
		margin: var(--space-2) calc(-1 * var(--space-2)) calc(-1 * var(--space-2));
	}

	.month-nav :global(a),
	.month-nav :global(button) {
		color: inherit;
		--tw-ring-color: var(--on-primary);
	}

	.month-nav :global(a:hover),
	.month-nav :global(a:active) {
		background: color-mix(in srgb, var(--on-primary) 12%, transparent);
	}

	/* Resultado spans the card; Ingresos and Gastos sit side by side beneath it. */
	.totals {
		display: grid;
		grid-template-columns: 1fr 1fr;
		margin: 0;
	}

	.box {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 1.25rem 1.25rem var(--space-4);
		/* Inherited by the hero amount. */
		overflow-wrap: anywhere;
	}

	.kv {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
		padding: var(--space-1) 1.25rem var(--space-4);
	}

	.k {
		font-size: var(--font-size-xs);
		font-weight: 500;
		color: var(--text-muted);
	}

	.am {
		margin: 0;
		font-size: var(--font-size-base);
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
		border-radius: var(--radius);
		text-decoration: none;
		color: var(--text-muted);
	}

	/* Touch: data-pressed (src/lib/press.ts); mouse: :active. */
	.bars a:global([data-pressed]) {
		background: var(--muted);
	}

	@media (hover: hover) and (pointer: fine) {
		.bars a:active {
			background: var(--muted);
		}
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

	/* Each bar is full height, slid down inside its clipping slot (at least 2px shows): the height
	   changes as a transform, and the rounded top keeps its shape. */
	.slot {
		width: 10px;
		height: 100%;
		overflow: hidden;
		border-radius: 4px 4px 1px 1px;
	}

	.bar {
		display: block;
		height: 100%;
		border-radius: 4px 4px 1px 1px;
		transform: translateY(min(calc(100% - var(--h)), calc(100% - 2px)));
	}

	@media (prefers-reduced-motion: no-preference) {
		.bar {
			transition: transform var(--dur-slow) var(--ease-out);
		}
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
		justify-content: center;
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

	.legend i {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 2px;
	}

	/* Canvas: the share sits beside the amount, muted. */
	.pct {
		margin-right: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: 400;
		color: var(--text-muted);
	}

	.empty-card {
		display: flex;
		align-items: center;
		min-height: 3.5rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.facts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.facts.single {
		grid-template-columns: 1fr;
	}

	.fact-link {
		display: block;
		min-width: 0;
		color: inherit;
		text-decoration: none;
		border-radius: var(--radius-card);
	}

	.fact-link:global([data-pressed]) :global(.card) {
		background: var(--muted);
	}

	@media (hover: hover) and (pointer: fine) {
		.fact-link:active :global(.card) {
			background: var(--muted);
		}
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
		/* 15px as the other row amounts; shrinks to 12px only when a long amount would not fit. */
		font-size: clamp(var(--font-size-xs), 12cqi, var(--font-size-base));
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		line-height: 1.2;
		white-space: nowrap;
	}
</style>
