<script lang="ts">
	import { CURRENCY_NAME } from '$lib/money';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Clock from '@lucide/svelte/icons/clock';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import CurrencyTabs from '$lib/components/CurrencyTabs.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Money from '$lib/components/Money.svelte';
	import HeroAmount from '$lib/components/HeroAmount.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatMoney } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const statusIcon = { ok: Check, warn: Clock, over: CircleAlert } as const;
	// Row pill by due status: paid is green, today is orange, overdue is inverted (never red).
	const dueIcon = { paid: Check, today: Clock, overdue: CircleAlert, upcoming: null } as const;
	const dueClass = { paid: 'ok', today: 'warn', overdue: 'over', upcoming: '' } as const;

	// Past 11 characters ("$ 12.345.678") the hero steps down so it never wraps or truncates.
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
			{@const Status = statusIcon[s.status]}
			<section class="summary" aria-labelledby="summary-heading">
				<Card.Root class="gap-0 overflow-hidden py-0">
					<div class="box">
						<div class="top">
							<h2 id="summary-heading" class="eyebrow">Disponible · {data.plan.monthName}</h2>
							<span class="pill {s.status}">
								<Status size={14} strokeWidth={2} />
								{data.plan.statusLabel}
							</span>
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
							<dd><Money cents={s.income} currency={data.currency} kind="income" /></dd>
						</div>
						<div class="kv">
							<dt>Pagos fijos</dt>
							<dd><Money cents={-s.bills} currency={data.currency} /></dd>
						</div>
						<div class="kv">
							<dt>Ahorro</dt>
							<dd><Money cents={-s.savings} currency={data.currency} /></dd>
						</div>
						<div class="kv sum">
							<dt>Para gastar</dt>
							<dd><Money cents={s.forSpending} currency={data.currency} /></dd>
						</div>
						<div class="kv">
							<dt>Gastado</dt>
							<dd><Money cents={-s.spent} currency={data.currency} /></dd>
						</div>
						<div class="kv sum">
							<dt>Disponible</dt>
							<dd><Money cents={s.available} currency={data.currency} /></dd>
						</div>
					</dl>
					<a class="footer" href={resolve('/plan/setup')}>
						Editar plan
						<Icon name="chevron-right" size="1.25rem" />
					</a>
				</Card.Root>
			</section>

			{#if s.limits.length}
				<section aria-labelledby="limits-heading">
					<div class="section-head"><h2 id="limits-heading">Límites por categoría</h2></div>
					<ul class="list-card">
						{#each s.limits as l (l.categoryId)}
							{@const pct = Math.min(100, Math.floor((l.spent * 100) / l.amount))}
							<li class="limit">
								<span class="name">
									<span class="title">{l.name}</span>
									{#if l.over}
										<span class="pill over"
											><CircleAlert size={14} strokeWidth={2} />Te pasaste</span
										>
									{:else if l.fast}
										<span class="pill warn"><Clock size={14} strokeWidth={2} />Vas rápido</span>
									{/if}
								</span>
								<span class="of">
									<span class="spent"><Money cents={l.spent} currency={data.currency} /></span> de
									<Money cents={l.amount} currency={data.currency} />
								</span>
								<div
									class="bar"
									role="meter"
									aria-label="Límite de {l.name}"
									aria-valuemin="0"
									aria-valuemax="100"
									aria-valuenow={pct}
									aria-valuetext="{formatMoney(l.spent, data.currency)} de {formatMoney(
										l.amount,
										data.currency
									)}"
								>
									<span class="fill" style:width="{pct}%"></span>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
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
			<!-- Each row opens the detail, where "Registrar pago" lives. -->
			{#snippet rule(r: (typeof data.incomes)[number])}
				{@const DueIcon = dueIcon[r.status]}
				<li class="rule">
					<ListRow href={resolve(`/plan/recurring/${r.id}`)}>
						{#snippet leading()}
							<span class="lead" aria-hidden="true">{r.description.charAt(0).toUpperCase()}</span>
						{/snippet}
						{#snippet title()}{r.description}{/snippet}
						{#snippet subtitle()}
							<span class="sub">
								<span class="pill {dueClass[r.status]}">
									{#if DueIcon}<DueIcon size={14} strokeWidth={2} />{/if}{r.label}
								</span>
								<span class="sub-text">Día {r.day} · {r.accountName}</span>
							</span>
						{/snippet}
						{#snippet trailing()}
							<span class="amount-col">
								<Money
									cents={r.type === 'income' ? r.amount : -r.amount}
									currency={data.currency}
									kind={r.type === 'income' ? 'income' : 'outcome'}
								/>
							</span>
						{/snippet}
					</ListRow>
				</li>
			{/snippet}

			<section aria-labelledby="income-heading">
				<div class="section-head">
					<h2 id="income-heading">Ingresos fijos</h2>
					<a class="add" href={resolve('/plan/recurring/new?type=income')}>Agregar</a>
				</div>
				{#if data.incomes.length}
					<ul class="list-card">
						{#each data.incomes as r (r.id)}{@render rule(r)}{/each}
					</ul>
				{:else}
					<p class="muted">Sin ingresos fijos.</p>
				{/if}
			</section>

			<section aria-labelledby="outcome-heading">
				<div class="section-head">
					<h2 id="outcome-heading">Pagos fijos</h2>
					<a class="add" href={resolve('/plan/recurring/new')}>Agregar</a>
				</div>
				{#if data.outcomes.length}
					<ul class="list-card">
						{#each data.outcomes as r (r.id)}{@render rule(r)}{/each}
					</ul>
				{:else}
					<p class="muted">Sin pagos fijos.</p>
				{/if}
			</section>

			{#if data.inactive.length}
				<section aria-labelledby="inactive-heading">
					<div class="section-head"><h2 id="inactive-heading">Inactivos</h2></div>
					<ul class="list-card">
						{#each data.inactive as r (r.id)}
							<li class="rule inactive">
								<ListRow href={resolve(`/plan/recurring/${r.id}`)}>
									{#snippet leading()}
										<span class="lead" aria-hidden="true"
											>{r.description.charAt(0).toUpperCase()}</span
										>
									{/snippet}
									{#snippet title()}{r.description}{/snippet}
									{#snippet subtitle()}
										<span class="sub">
											<span class="pill">{r.reason}</span>
											<span class="sub-text">Día {r.day} · {r.accountName}</span>
										</span>
									{/snippet}
									{#snippet trailing()}
										<span class="amount-col">
											<Money cents={r.amount} currency={data.currency} />
										</span>
									{/snippet}
								</ListRow>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
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

	h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	.eyebrow {
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.muted {
		color: var(--text-muted);
	}

	.strong {
		font-weight: 500;
	}

	.section-head .add {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		color: var(--text);
		font-weight: 500;
		text-decoration: underline;
	}

	/* Disponible card: hero, then the plan's equation, then the Editar footer. */
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

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.625rem;
		border-radius: var(--radius-pill);
		background: var(--muted);
		color: var(--text-muted);
		font-size: var(--font-size-xs);
		font-weight: 600;
		white-space: nowrap;
	}

	.pill.ok {
		background: color-mix(in srgb, var(--positive) 14%, transparent);
		color: var(--positive);
	}

	.pill.warn {
		background: color-mix(in srgb, var(--swatch-orange) 14%, transparent);
		color: var(--swatch-orange);
	}

	/* Over budget or overdue is information, not an error: inverted fill, never red. */
	.pill.over {
		background: var(--text);
		color: var(--bg);
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

	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 3rem;
		padding: 0 var(--space-3) 0 1.25rem;
		border-top: 1px solid var(--border);
		font-weight: 500;
		text-decoration: none;
		color: var(--text);
	}

	.footer :global(svg) {
		color: var(--border-strong);
	}

	@media (hover: hover) {
		.footer:hover {
			background: var(--muted);
		}
	}

	.footer:active {
		background: var(--muted);
	}

	.footer:focus-visible {
		outline-offset: -2px;
	}

	.no-plan {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
	}

	/* Límites */
	.limit {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1) var(--space-3);
		padding: 0.875rem var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.limit:last-child {
		border-bottom: 0;
	}

	.name {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		font-weight: 500;
	}

	.title {
		overflow-wrap: anywhere;
	}

	.of {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.spent {
		color: var(--text);
		font-weight: 600;
	}

	.bar {
		flex: 1 0 100%;
		height: 0.375rem;
		margin-top: var(--space-2);
		overflow: hidden;
		background: var(--muted);
		border-radius: var(--radius-pill);
	}

	.fill {
		display: block;
		height: 100%;
		background: var(--text);
		border-radius: var(--radius-pill);
	}

	/* Fixed rows: neutral letter badge, amount, due pill. */
	.lead {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--radius);
		background: var(--muted);
		color: var(--text);
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.sub {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		margin-top: 0.25rem;
	}

	.sub-text {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.amount-col {
		font-size: var(--font-size-base);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.inactive .amount-col {
		color: var(--text-muted);
	}
</style>
