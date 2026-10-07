<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import CurrencyTabs from '$lib/components/CurrencyTabs.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatMoney } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const currencyName = { ARS: 'pesos', USD: 'dólares' } as const;
</script>

<svelte:head>
	<title>Plan · Gastar</title>
</svelte:head>

<PageHeader title="Plan" />

<div class="page">
	<CurrencyTabs value={data.currency} />
	{#if data.saved}<p role="status" class="saved">Pago registrado.</p>{/if}
	{#if data.planSaved}<p role="status" class="saved">Plan guardado.</p>{/if}

	{#if !data.hasCurrency}
		<EmptyState icon="accounts">No tenés cuentas en {currencyName[data.currency]}.</EmptyState>
		<div class="center"><Button href={resolve('/accounts/new')}>Crear cuenta</Button></div>
	{:else}
		{#if data.plan.summary}
			{@const s = data.plan.summary}
			<section class="summary" aria-labelledby="summary-heading">
				<Card>
					<h2 id="summary-heading">Disponible · {data.plan.monthName}</h2>
					<p class="hero"><Money cents={s.available} currency={data.currency} /></p>
					<p class="status {s.status}">{data.plan.statusLabel}</p>
					<p class="per-day">
						<Money cents={s.perDay} currency={data.currency} /> por día · quedan {s.daysLeft}
						{s.daysLeft === 1 ? 'día' : 'días'}
					</p>
					<dl class="figures">
						<div>
							<dt>Ingresos</dt>
							<dd><Money cents={s.income} currency={data.currency} /></dd>
						</div>
						<div>
							<dt>Pagos fijos</dt>
							<dd><Money cents={s.bills} currency={data.currency} /></dd>
						</div>
						<div>
							<dt>Ahorro</dt>
							<dd><Money cents={s.savings} currency={data.currency} /></dd>
						</div>
						<div class="sum">
							<dt>Para gastar</dt>
							<dd><Money cents={s.forSpending} currency={data.currency} /></dd>
						</div>
						<div>
							<dt>Gastado</dt>
							<dd><Money cents={s.spent} currency={data.currency} /></dd>
						</div>
						<div class="sum">
							<dt>Disponible</dt>
							<dd><Money cents={s.available} currency={data.currency} /></dd>
						</div>
					</dl>
					<a class="edit-link" href={resolve('/plan/setup')}>Editar plan</a>
				</Card>
			</section>

			{#if s.limits.length}
				<section aria-labelledby="limits-heading">
					<div class="section-head"><h2 id="limits-heading">Límites por categoría</h2></div>
					<ul class="list-card">
						{#each s.limits as l (l.categoryId)}
							{@const pct = Math.min(100, Math.floor((l.spent * 100) / l.amount))}
							<li class="limit">
								<span class="title">{l.name}</span>
								<span class="of">
									<Money cents={l.spent} currency={data.currency} /> de
									<Money cents={l.amount} currency={data.currency} />
								</span>
								{#if l.over}
									<span class="flag">Te pasaste</span>
								{:else if l.fast}
									<span class="flag">Vas rápido</span>
								{/if}
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
									<span class="fill" class:over={l.over} style:width="{pct}%"></span>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{:else}
			<Card>
				{#if data.plan.endedMonthName}
					<p class="ended">Tu plan de {data.plan.endedMonthName} terminó.</p>
				{/if}
				<p class="no-plan">Todavía no tenés un plan en {currencyName[data.currency]}.</p>
				<p class="muted">
					Sumá tus ingresos, restá pagos fijos y ahorro, y te decimos cuánto podés gastar por día.
				</p>
				<Button href={resolve('/plan/setup')}>Crear plan</Button>
			</Card>
		{/if}

		{#if !data.incomes.length && !data.outcomes.length && !data.inactive.length}
			<EmptyState icon="plan">
				No tenés pagos ni ingresos fijos en {currencyName[data.currency]}.
			</EmptyState>
			<div class="center actions">
				<Button href={resolve('/plan/recurring/new')}>Agregar pago fijo</Button>
				<Button href={resolve('/plan/recurring/new?type=income')} variant="secondary">
					Agregar ingreso fijo
				</Button>
			</div>
		{:else}
			{#snippet rule(r: (typeof data.incomes)[number])}
				<li class="rule">
					<a class="main" href={resolve(`/plan/recurring/${r.id}`)}>
						<span class="text">
							<span class="title">{r.description}</span>
							<span class="sub">{r.label} · Día {r.day} · {r.accountName}</span>
						</span>
						<span class="amount-col">
							<Money
								cents={r.amount}
								currency={data.currency}
								kind={r.type === 'income' ? 'income' : 'plain'}
							/>
						</span>
					</a>
					{#if r.status !== 'paid'}
						<a
							class="register"
							href={resolve(`/movements/new?recurring=${r.id}`)}
							aria-label="Registrar {r.description}">Registrar</a
						>
					{/if}
				</li>
			{/snippet}

			<section aria-labelledby="income-heading">
				<div class="section-head">
					<h2 id="income-heading">Ingresos fijos</h2>
					<a href={resolve('/plan/recurring/new?type=income')}>Agregar</a>
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
					<a href={resolve('/plan/recurring/new')}>Agregar</a>
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
							<li class="rule">
								<a class="main" href={resolve(`/plan/recurring/${r.id}`)}>
									<span class="text">
										<span class="title">{r.description}</span>
										<span class="sub">{r.reason} · Día {r.day} · {r.accountName}</span>
									</span>
									<span class="amount-col muted">
										<Money cents={r.amount} currency={data.currency} />
									</span>
								</a>
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

	.saved {
		align-self: flex-start;
		color: var(--positive);
		font-weight: 500;
	}

	.section-head a {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		color: var(--text);
		font-weight: 500;
		text-decoration: underline;
	}

	h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	.muted {
		color: var(--text-muted);
	}

	.summary :global(.card),
	.page > :global(.card) {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		align-items: flex-start;
	}

	.hero {
		font-size: clamp(1.5rem, 9vw, var(--font-size-hero));
		font-weight: 600;
		line-height: 1.1;
	}

	.status {
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-pill);
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.status.over {
		border-color: var(--negative);
		color: var(--negative);
	}

	.per-day {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.figures {
		align-self: stretch;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
	}

	.figures div {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--space-1) var(--space-3);
	}

	.figures dt {
		color: var(--text-muted);
	}

	.figures dd {
		margin: 0;
		margin-inline-start: auto;
		text-align: end;
		font-weight: 500;
	}

	.figures .sum {
		padding-top: var(--space-2);
		border-top: 1px solid var(--border);
		font-weight: 600;
	}

	.edit-link {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-decoration: underline;
	}

	.ended,
	.no-plan {
		font-weight: 600;
	}

	.limit {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.limit:last-child {
		border-bottom: 0;
	}

	.limit .title {
		flex: 1 1 8rem;
	}

	.of {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.flag {
		flex: 1 0 100%;
		font-size: var(--font-size-xs);
		font-weight: 600;
	}

	.bar {
		flex: 1 0 100%;
		height: 0.5rem;
		overflow: hidden;
		background: var(--muted);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-pill);
	}

	.fill {
		display: block;
		height: 100%;
		background: var(--primary);
	}

	.fill.over {
		background: var(--negative);
	}

	.rule {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		border-bottom: 1px solid var(--border);
	}

	.rule:last-child {
		border-bottom: 0;
	}

	.main {
		flex: 1 1 14rem;
		min-width: 0;
		min-height: 2.75rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		text-decoration: none;
		color: inherit;
	}

	@media (hover: hover) {
		.main:hover {
			background: var(--muted);
		}
	}

	.text {
		flex: 1 1 8rem;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.title {
		font-size: var(--font-size-sm);
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.sub {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}

	.amount-col {
		flex: 0 1 auto;
		font-size: var(--font-size-sm);
		font-weight: 600;
		text-align: right;
	}

	.register {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text);
		text-decoration: underline;
	}
</style>
