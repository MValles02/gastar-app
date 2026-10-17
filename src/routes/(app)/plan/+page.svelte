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
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import Money from '$lib/components/Money.svelte';
	import HeroAmount from '$lib/components/HeroAmount.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
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
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon"><Icon name="accounts" size="1rem" /></Empty.Media>
				<Empty.Description>No tenés cuentas en {CURRENCY_NAME[data.currency]}.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
		<div class="center"><Button href={resolve('/accounts/new')}>Crear cuenta</Button></div>
	{:else}
		{#if data.plan.summary}
			{@const s = data.plan.summary}
			<section class="summary" aria-labelledby="summary-heading">
				<Card.Root class="gap-0 overflow-hidden py-0">
					<div class="box">
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
					</div>
					<dl class="figures">
						<div class="kv">
							<dt>Ingresos</dt>
							<dd>
								<Money cents={s.income} currency={data.currency} tone="flow" direction="income" />
							</dd>
						</div>
						<div class="kv">
							<dt>Pagos fijos</dt>
							<dd>
								<Money cents={-s.bills} currency={data.currency} tone="flow" direction="outcome" />
							</dd>
						</div>
						<div class="kv link">
							<dt><a href={resolve('/plan/savings')}>Ahorro</a></dt>
							<dd>
								<Money cents={s.savings} currency={data.currency} />
								<Icon name="chevron-right" size="1.25rem" />
							</dd>
						</div>
						<div class="kv sum">
							<dt>Para gastar</dt>
							<dd><Money cents={s.forSpending} currency={data.currency} /></dd>
						</div>
						<div class="kv">
							<dt>Gastado</dt>
							<dd>
								<Money cents={-s.spent} currency={data.currency} tone="flow" direction="outcome" />
							</dd>
						</div>
						<div class="kv sum">
							<dt>Disponible</dt>
							<dd><Money cents={s.available} currency={data.currency} /></dd>
						</div>
					</dl>
				</Card.Root>
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
						<p class="strong">Todavía no tenés un plan en {CURRENCY_NAME[data.currency]}.</p>
						<p class="muted">
							Sumá tus ingresos, restá pagos fijos y ahorro, y te decimos cuánto podés gastar por
							día.
						</p>
						<Button href={resolve('/plan/setup')}>Crear plan</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		{#if !data.incomes.length && !data.outcomes.length && !data.inactive.length}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Icon name="plan" size="1rem" /></Empty.Media>
					<Empty.Description
						>No tenés pagos ni ingresos fijos en {CURRENCY_NAME[data.currency]}.</Empty.Description
					>
				</Empty.Header>
			</Empty.Root>
			<div class="center actions">
				<Button href={resolve('/plan/recurring/new')}>Agregar pago fijo</Button>
				<Button href={resolve('/plan/recurring/new?type=income')} variant="outline">
					Agregar ingreso fijo
				</Button>
			</div>
		{:else}
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
					<p class="muted">Sin ingresos fijos.</p>
				{/if}
			</section>

			<section aria-labelledby="outcome-heading">
				<SectionHeader
					id="outcome-heading"
					title="Pagos fijos"
					action={{ href: '/plan/recurring/new' }}
				/>
				{#if data.outcomes.length}
					<ListCard>
						{#each data.outcomes as r (r.id)}<RecurringRow
								row={r}
								currency={data.currency}
							/>{/each}
					</ListCard>
				{:else}
					<p class="muted">Sin pagos fijos.</p>
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

	.actions {
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.muted {
		color: var(--text-muted);
	}

	.strong {
		font-weight: 500;
	}

	/* Disponible card: hero, then the plan's equation, then the Ahorro link. */
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
		padding: 0 1.25rem;
		border-top: 1px solid var(--border);
		font-size: var(--font-size-sm);
	}

	.kv {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0 var(--space-3);
		min-height: 3rem;
	}

	.kv + .kv {
		border-top: 1px solid var(--border);
	}

	.figures dt {
		font-weight: 500;
		color: var(--text-muted);
	}

	.figures dd {
		margin: 0;
		margin-inline-start: auto;
		text-align: end;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.figures .sum dt {
		color: var(--text);
		font-weight: 600;
	}

	.figures .sum dd {
		font-weight: 600;
	}

	.kv.link {
		position: relative;
	}

	.kv.link a {
		color: inherit;
		text-decoration: none;
	}

	/* The whole row is the tap target. */
	.kv.link a::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	.kv.link dd {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.kv.link dd :global(svg) {
		color: var(--border-strong);
	}

	@media (hover: hover) {
		.kv.link:hover {
			background: var(--muted);
		}
	}

	.kv.link:active {
		background: var(--muted);
	}

	.no-plan {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
	}
</style>
