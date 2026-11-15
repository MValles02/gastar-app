<script lang="ts">
	import { formatMoney } from '#lib/money.ts';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import ActionLink from '#lib/components/ActionLink.svelte';
	import CardEyebrow from '#lib/components/CardEyebrow.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import Money from '#lib/components/Money.svelte';
	import HeroAmount from '#lib/components/HeroAmount.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SectionHeader from '#lib/components/SectionHeader.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import { stripFlags } from '#lib/nav-stack.svelte.ts';
	import { limitFlag } from '#lib/toast-flags.ts';
	import { openShallow } from '#lib/open-shallow.ts';
	import { PLAN_CURRENCY, PLAN_TONE } from '#lib/plan.ts';
	import LimitList from './LimitList.svelte';
	import RecurringRow from './RecurringRow.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Without JavaScript there is no toast: the server-rendered status stands in until hydration.
	let hydrated = $state(false);
	onMount(() => (hydrated = true));
	// An alert's `?limit=<categoryId>` opens that limit's drawer over the plan, then drops the flag
	// (before the push: stripping replaces the entry's state).
	async function openLimit(id: string) {
		await stripFlags(['limit']);
		await openShallow(null, resolve(`plan/limits/${id}`), 'limit');
	}

	const rateLabel = (r: { value: number | null; manual: boolean; date: string | null }) =>
		r.value === null
			? 'Sin cotización'
			: `Cotización: ${formatMoney(r.value, 'ARS')} (${r.manual ? 'manual' : `última compra, ${r.date}`})`;

	afterNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return;
		if (data.planSaved) {
			toast.success('Plan guardado.');
			void stripFlags();
		}
		const limit = limitFlag(page.url.searchParams);
		if (limit) void openLimit(limit);
	});
</script>

<svelte:head>
	<title>Plan · Gastar</title>
</svelte:head>

{#snippet addLimit()}
	<ActionLink
		href="/plan/limits/new"
		label="+ Agregar"
		onclick={(e) => openShallow(e, resolve('plan/limits/new'), 'newLimit')}
	/>
{/snippet}
{#snippet addIncome()}
	<ActionLink
		href="/plan/recurring/new?type=income"
		label="+ Agregar"
		onclick={(e) => openShallow(e, resolve('plan/recurring/new?type=income'), 'newRule')}
	/>
{/snippet}
{#snippet addOutcome()}
	<ActionLink
		href="/plan/recurring/new?type=outcome"
		label="+ Agregar"
		onclick={(e) => openShallow(e, resolve('plan/recurring/new?type=outcome'), 'newRule')}
	/>
{/snippet}

<PageHeader title="Plan" />

<div class="page">
	{#if !hydrated}
		{#if data.planSaved}<p role="status">Plan guardado.</p>{/if}
	{/if}

	{#if !data.hasAccount}
		<EmptyState icon="accounts" description="No tenés cuentas.">
			<Button href={resolve('accounts/new')}>Crear cuenta</Button>
		</EmptyState>
	{:else}
		{#if data.plan.summary}
			{@const s = data.plan.summary}
			<section aria-labelledby="summary-heading">
				<Card.Root class="gap-0 overflow-hidden py-0">
					<div class="box">
						<div class="top">
							<CardEyebrow as="h2" id="summary-heading">Disponible</CardEyebrow>
							<StatusPill tone={PLAN_TONE[s.status]} label={data.plan.statusLabel} />
						</div>
						<HeroAmount cents={s.available} currency={PLAN_CURRENCY} />
						<p class="per-day">
							<Money cents={s.perDay} currency={PLAN_CURRENCY} /> por día · {s.daysLeft === 1
								? 'queda 1 día'
								: `quedan ${s.daysLeft} días`}
						</p>
					</div>
					<dl class="figures">
						<div class="kv">
							<dt>Ingresos</dt>
							<dd>
								<Money cents={s.income} currency={PLAN_CURRENCY} tone="flow" direction="income" />
							</dd>
						</div>
						<div class="kv">
							<dt>Pagos fijos</dt>
							<dd>
								<Money
									cents={-s.pendingBills}
									currency={PLAN_CURRENCY}
									tone="flow"
									direction="outcome"
								/>
							</dd>
						</div>
						<div class="kv link">
							<dt>
								<a
									href={resolve('plan/savings')}
									onclick={(e) => openShallow(e, resolve('plan/savings'), 'savings')}
									>Ahorro<span aria-hidden="true">&nbsp;›</span></a
								>
							</dt>
							<dd><Money cents={s.savings} currency={PLAN_CURRENCY} /></dd>
						</div>
						<div class="kv">
							<dt>Gastado</dt>
							<dd>
								<Money cents={-s.spent} currency={PLAN_CURRENCY} tone="flow" direction="outcome" />
							</dd>
						</div>
					</dl>
					<a
						class="rate"
						href={resolve('plan/rate')}
						onclick={(e) => openShallow(e, resolve('plan/rate'), 'rate')}
						>{rateLabel(data.plan.rate)}<span aria-hidden="true">&nbsp;›</span></a
					>
				</Card.Root>
			</section>
			{#if data.plan.missingRate}
				<p role="note" class="muted">
					Sin cotización: lo que está en dólares no se suma a los totales.
				</p>
			{/if}

			<section aria-labelledby="limits-heading">
				<SectionHeader id="limits-heading" title="Límites por categoría" aside={addLimit} />
				<LimitList limits={s.limits} />
			</section>
		{:else}
			<Card.Root>
				<Card.Content>
					<div class="no-plan">
						{#if data.plan.endedMonthName}
							<p class="strong">Tu plan de {data.plan.endedMonthName} terminó.</p>
						{/if}
						<p class="strong">Sin plan</p>
						<p class="muted">Calculá cuánto podés gastar por día.</p>
						<Button href={resolve('plan/setup')}>Crear plan</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		{#if data.plan.summary || data.incomes.length || data.outcomes.length || data.inactive.length}
			<section aria-labelledby="income-heading">
				<SectionHeader id="income-heading" title="Ingresos fijos" aside={addIncome} />
				{#if data.incomes.length}
					<ListCard>
						{#each data.incomes as r (r.id)}<RecurringRow row={r} />{/each}
					</ListCard>
				{:else}
					<EmptyState icon="plan" description="Sin ingresos fijos." />
				{/if}
			</section>

			<section aria-labelledby="outcome-heading">
				<SectionHeader id="outcome-heading" title="Pagos fijos pendientes" aside={addOutcome} />
				{#if data.outcomes.length}
					<ListCard>
						{#each data.outcomes as r (r.id)}<RecurringRow row={r} />{/each}
					</ListCard>
				{:else}
					<EmptyState icon="plan" description="Sin pagos fijos." />
				{/if}
			</section>

			{#if data.inactive.length}
				<section aria-labelledby="inactive-heading">
					<SectionHeader id="inactive-heading" title="Inactivos" />
					<ListCard>
						{#each data.inactive as r (r.id)}<RecurringRow row={r} />{/each}
					</ListCard>
				</section>
			{/if}
		{/if}

		{#if data.plan.summary}
			<div class="center">
				<ConfirmDialog
					triggerLabel="Eliminar plan"
					triggerVariant="destructive"
					triggerClass="h-11 border-transparent bg-transparent px-4 font-normal hover:bg-transparent dark:border-transparent dark:bg-transparent"
					title="¿Eliminar este plan?"
					confirmLabel="Eliminar"
					action="?/delete"
				>
					Se borran el plan y sus límites. Tus ingresos y pagos fijos se mantienen.
				</ConfirmDialog>
			</div>
		{/if}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.center {
		display: flex;
		justify-content: center;
	}

	.muted {
		color: var(--text-muted);
	}

	.strong {
		font-weight: 500;
	}

	.box {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 1.25rem 1.25rem var(--space-4);
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 1.375rem;
	}

	.per-day {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.figures {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4) var(--space-5);
		padding: var(--space-2) 1.25rem 1.25rem;
		font-size: var(--font-size-sm);
	}

	.kv {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.figures dt {
		font-weight: 500;
		color: var(--text-muted);
	}

	.figures dd {
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--font-size-base);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.kv.link a {
		color: inherit;
		text-decoration: none;
	}

	/* The whole figure is the tap target. */
	.kv.link a::after {
		content: '';
		position: absolute;
		inset: calc(var(--space-2) * -1);
	}

	.rate {
		display: block;
		padding: var(--space-3) 1.25rem var(--space-4);
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text-muted);
		text-decoration: none;
	}

	.no-plan {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
	}
</style>
