<script lang="ts">
	import { formatPercent } from '#lib/locale.ts';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import ActionLink from '#lib/components/ActionLink.svelte';
	import CurrencyTabs from '#lib/components/CurrencyTabs.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import FirstRunChecklist from '#lib/components/FirstRunChecklist.svelte';
	import CardEyebrow from '#lib/components/CardEyebrow.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import Meter from '#lib/components/Meter.svelte';
	import Money from '#lib/components/Money.svelte';
	import HeroAmount from '#lib/components/HeroAmount.svelte';
	import MovementRow from '#lib/components/movements/MovementRow.svelte';
	import MpPill from './MpPill.svelte';
	import PaceChart from '#lib/components/PaceChart.svelte';
	import UpcomingBills from './UpcomingBills.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import TabBand from '#lib/components/TabBand.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import { PLAN_TONE } from '#lib/plan.ts';
	import { swatchVar, toSwatchKey } from '#lib/appearance.ts';
	import { appear, fade } from '#lib/motion.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Gastar</title>
</svelte:head>

<PageHeader title="Hola, {data.header.firstName}" tone="primary" />

<TabBand>
	{#if data.hasAnyAccount}
		<div class="pill-row">
			<CurrencyTabs value={data.currency} variant="pills" tone="primary" />
			{#if data.mpPending !== null}<MpPill pending={data.mpPending} />{/if}
		</div>
	{/if}
</TabBand>

<div class="dashboard">
	{#if !data.hasAnyAccount}
		<FirstRunChecklist steps={data.steps} />
	{:else}
		{#if !data.firstRunDone}
			<FirstRunChecklist steps={data.steps} />
		{/if}

		{#if !data.hasCurrencyAccount}
			<Card.Root>
				<EmptyState icon="accounts" description="Sin cuentas en {data.currencyWord}.">
					<Button href={resolve('accounts/new')}>Crear cuenta</Button>
				</EmptyState>
			</Card.Root>
		{:else}
			<section aria-labelledby="summary-heading">
				<Card.Root class="gap-0 overflow-hidden py-0">
					{#if data.plan?.summary}
						{@const s = data.plan.summary}
						<div class="box" in:fade>
							<div class="top">
								<CardEyebrow as="h2" id="summary-heading">Disponible</CardEyebrow>
								<StatusPill tone={PLAN_TONE[s.status]} label={data.plan.statusLabel} />
							</div>
							<HeroAmount class="available-amount" cents={s.available} currency="ARS" />
							<p class="muted per-day">
								<Money cents={s.perDay} currency="ARS" /> por día · {s.daysLeft === 1
									? 'queda 1 día'
									: `quedan ${s.daysLeft} días`}
							</p>
							{#if data.plan.pace}
								<PaceChart
									points={data.plan.pace.points}
									days={data.plan.pace.days}
									budget={data.plan.pace.budget}
								/>
								<div class="pace-tag">
									<StatusPill tone={data.plan.pace.tag.tone} label={data.plan.pace.tag.label} />
								</div>
							{/if}
						</div>
						<div class="cols">
							<div class="col">
								<span class="k">Saldo total</span>
								<span class="am"><Money cents={data.balance} currency={data.currency} /></span>
							</div>
							<div class="col">
								<span class="k">Resultado del mes</span>
								<span class="am net">
									<Money cents={data.monthNet} currency={data.currency} tone="flow" />
								</span>
							</div>
						</div>
					{:else}
						<div class="box" in:fade>
							<CardEyebrow as="h2" id="summary-heading">Saldo total</CardEyebrow>
							<HeroAmount cents={data.balance} currency={data.currency} />
							<p class="muted per-day">
								Resultado del mes
								<span class="net"
									><Money cents={data.monthNet} currency={data.currency} tone="flow" /></span
								>
							</p>
							{#if data.plan?.endedMonthName}
								<p class="strong">Terminó el plan de {data.plan.endedMonthName}.</p>
							{/if}
						</div>
						<div class="no-plan">
							<Button href={resolve('plan/setup')} class="w-full">Crear plan</Button>
						</div>
					{/if}
				</Card.Root>
			</section>

			{#if data.bills}
				<UpcomingBills bills={data.bills} currency={data.currency} monthName={data.monthName} />
			{/if}

			{#if data.recent.length > 0}
				<section aria-labelledby="categories-heading" in:appear>
					<div class="section-head">
						<h2 id="categories-heading">Gastos de {data.monthName}</h2>
						<ActionLink href="/reports" label="Ver reportes" />
					</div>
					{#if data.topCategories.length === 0}
						<Card.Root>
							<Card.Content><p class="muted inline-empty" in:fade>No hay gastos.</p></Card.Content>
						</Card.Root>
					{:else}
						<ListCard>
							{#each data.topCategories as cat (cat.id)}
								{#snippet catValue()}
									<span class="pct">{formatPercent(cat.share)}</span>
									<Money
										cents={cat.net}
										currency={data.currency}
										tone="flow"
										direction={cat.net < 0 ? 'income' : 'outcome'}
									/>
								{/snippet}
								{#snippet catFooter()}
									<Meter percent={cat.share * 100} color={swatchVar(cat.color)} />
								{/snippet}
								<ListRow
									lead={{
										icon: cat.icon ?? undefined,
										letter: cat.icon ? undefined : cat.name.charAt(0).toUpperCase(),
										color: toSwatchKey(cat.color)
									}}
									title={cat.name}
									value={catValue}
									footer={catFooter}
								/>
							{/each}
						</ListCard>
					{/if}
				</section>
			{/if}

			<section aria-labelledby="recent-heading">
				<div class="section-head">
					<h2 id="recent-heading">Últimos movimientos</h2>
					{#if data.recent.length > 0}
						<ActionLink href="/movements?currency={data.currency}&all=1" label="Ver todos" />
					{/if}
				</div>
				{#if data.recent.length === 0}
					<Card.Root>
						<Card.Content>
							<p class="muted inline-empty" in:fade>
								Todavía no hay movimientos en {data.currencyWord}.
							</p>
						</Card.Content>
					</Card.Root>
				{:else}
					<ListCard>
						{#each data.recent as m (m.id)}
							<MovementRow {m} date={m.dateLabel} />
						{/each}
					</ListCard>
				{/if}
			</section>
		{/if}
	{/if}
</div>

<style>
	/* Positioned so its first card paints over the band it overlaps (TabBand). */
	.dashboard {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	/* Canvas row height: 60px minimum for every list row on Inicio. */
	.dashboard :global([data-slot='item']) {
		min-height: 3.75rem;
	}

	.pct {
		margin-right: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: 400;
		color: var(--text-muted);
	}

	.pill-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.muted {
		color: var(--text-muted);
	}

	.strong {
		font-weight: 500;
	}

	.section-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
		margin-bottom: 0.875rem;
		padding-inline: var(--space-1);
	}

	.section-head h2 {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-muted);
	}

	.box {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 1.25rem 1.25rem var(--space-4);
	}

	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 1.375rem;
	}

	.per-day {
		font-size: var(--font-size-sm);
	}

	.pace-tag {
		display: flex;
		justify-content: flex-end;
	}

	.per-day .net {
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.cols {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 7rem), 1fr));
	}

	.col {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: var(--space-3) 1.25rem;
		min-width: 0;
	}

	.k {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.am {
		font-size: var(--font-size-base);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.no-plan {
		padding: 0.875rem 1.25rem 1.25rem;
	}

	.inline-empty {
		display: flex;
		align-items: center;
		min-height: 2rem;
		font-size: var(--font-size-sm);
	}
</style>
