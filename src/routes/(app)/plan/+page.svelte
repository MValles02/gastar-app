<script lang="ts">
	import { CURRENCY_NAME } from '$lib/money';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import CardEyebrow from '$lib/components/CardEyebrow.svelte';
	import CurrencyTabs from '$lib/components/CurrencyTabs.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import Money from '$lib/components/Money.svelte';
	import HeroAmount from '$lib/components/HeroAmount.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import SummaryCard from '$lib/components/SummaryCard.svelte';
	import { PLAN_TONE } from '$lib/status';
	import LimitList from './LimitList.svelte';
	import RecurringRow from './RecurringRow.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Without JavaScript there is no toast: the server-rendered status stands in until hydration.
	let hydrated = $state(false);
	onMount(() => (hydrated = true));
	// Toast once per saved redirect, then strip the flags from the URL so a reload does not toast
	// again. Runs in afterNavigate because replaceState throws before the router is initialized
	// (hard load of ?saved=1), hence the retry.
	const stripFlags = () => {
		try {
			const url = new URL(page.url);
			url.searchParams.delete('saved');
			url.searchParams.delete('planSaved');
			replaceState(resolve((url.pathname + url.search + url.hash) as '/'), {});
		} catch {
			setTimeout(stripFlags, 50);
		}
	};
	afterNavigate(() => {
		if (data.saved || data.planSaved) {
			toast.success(data.saved ? 'Pago registrado.' : 'Plan guardado.');
			stripFlags();
		}
	});
</script>

<svelte:head>
	<title>Plan · Gastar</title>
</svelte:head>

<PageHeader title="Plan" />

<div class="page">
	<CurrencyTabs value={data.currency} />
	{#if !hydrated}
		{#if data.saved}<p role="status">Pago registrado.</p>{/if}
		{#if data.planSaved}<p role="status">Plan guardado.</p>{/if}
	{/if}

	{#if !data.hasCurrency}
		<EmptyState icon="accounts" description="No tenés cuentas en {CURRENCY_NAME[data.currency]}.">
			<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
		</EmptyState>
	{:else}
		{#if data.plan.summary}
			{@const s = data.plan.summary}
			<section aria-labelledby="summary-heading">
				<SummaryCard
					currency={data.currency}
					income={s.income}
					bills={s.bills}
					savings={s.savings}
					forSpending={s.forSpending}
					spent={s.spent}
					savingsHref={resolve('/plan/savings')}
				>
					{#snippet header()}
						<div class="top">
							<CardEyebrow as="h2" id="summary-heading"
								>Disponible · {data.plan.monthName}</CardEyebrow
							>
							<StatusPill tone={PLAN_TONE[s.status]} label={data.plan.statusLabel} />
						</div>
						<HeroAmount cents={s.available} currency={data.currency} />
						<p class="per-day">
							<Money cents={s.perDay} currency={data.currency} />/día · {s.daysLeft}
							{s.daysLeft === 1 ? 'día' : 'días'}
						</p>
					{/snippet}
				</SummaryCard>
			</section>

			<section aria-labelledby="limits-heading">
				<SectionHeader
					id="limits-heading"
					title="Límites por categoría"
					action={{ href: '/plan/limits/new' }}
				/>
				<LimitList limits={s.limits} currency={data.currency} />
			</section>
		{:else}
			<Card.Root>
				<Card.Content>
					<div class="no-plan">
						{#if data.plan.endedMonthName}
							<p class="strong">Tu plan de {data.plan.endedMonthName} terminó.</p>
						{/if}
						<p class="strong">Sin plan en {CURRENCY_NAME[data.currency]}</p>
						<p class="muted">Calculá cuánto podés gastar por día.</p>
						<Button href={resolve('/plan/setup')}>Crear plan</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		{#if data.plan.summary || data.incomes.length || data.outcomes.length || data.inactive.length}
			<section aria-labelledby="income-heading">
				<SectionHeader
					id="income-heading"
					title="Ingresos fijos"
					action={{ href: '/plan/recurring/new?type=income' }}
				/>
				{#if data.incomes.length}
					<ListCard>
						{#each data.incomes as r (r.id)}<RecurringRow row={r} currency={data.currency} />{/each}
					</ListCard>
				{:else}
					<EmptyState icon="plan" description="Sin ingresos fijos." />
				{/if}
			</section>

			<section aria-labelledby="outcome-heading">
				<SectionHeader
					id="outcome-heading"
					title="Pagos fijos"
					action={{ href: '/plan/recurring/new?type=outcome' }}
				/>
				{#if data.outcomes.length}
					<ListCard>
						{#each data.outcomes as r (r.id)}<RecurringRow
								row={r}
								currency={data.currency}
							/>{/each}
					</ListCard>
				{:else}
					<EmptyState icon="plan" description="Sin pagos fijos." />
				{/if}
			</section>

			{#if data.inactive.length}
				<section aria-labelledby="inactive-heading">
					<SectionHeader id="inactive-heading" title="Inactivos" />
					<ListCard>
						{#each data.inactive as r (r.id)}<RecurringRow
								row={r}
								currency={data.currency}
							/>{/each}
					</ListCard>
				</section>
			{/if}
		{/if}

		{#if data.plan.summary}
			<div class="center">
				<ConfirmDialog
					triggerLabel="Eliminar plan"
					triggerVariant="destructive"
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

	.no-plan {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
	}
</style>
