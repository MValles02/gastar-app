<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import CurrencyTabs from '$lib/components/CurrencyTabs.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Money from '$lib/components/Money.svelte';
	import MovementRow from '$lib/components/MovementRow.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatMoney } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const percent = new Intl.NumberFormat('es-AR', { style: 'percent' });
	const currencyName = { ARS: 'pesos', USD: 'dólares' } as const;
</script>

<svelte:head>
	<title>Gastar</title>
</svelte:head>

<PageHeader title="Hola, {data.header.firstName}" />

<div class="dashboard">
	{#if !data.hasAnyAccount}
		<EmptyState icon="accounts">
			Todavía no tenés cuentas. Creá la primera para empezar a registrar tus movimientos.
		</EmptyState>
		<div class="empty-action">
			<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
		</div>
	{:else}
		<CurrencyTabs value={data.currency} />

		{#if !data.hasCurrencyAccount}
			<EmptyState icon="accounts">No tenés cuentas en {data.currency}.</EmptyState>
			<div class="empty-action">
				<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
			</div>
		{:else}
			<section aria-labelledby="balance-heading">
				<Card>
					<p id="balance-heading" class="label">Saldo total</p>
					<p class="hero-amount"><Money cents={data.balance} currency={data.currency} /></p>
					<div class="month">
						<p class="label">
							<span class="visually-hidden">Balance del mes: </span>{data.month.label}
						</p>
						<p class="net">
							<Money
								cents={data.monthNet}
								currency={data.currency}
								kind={data.monthNet > 0 ? 'income' : 'plain'}
							/>
						</p>
					</div>
				</Card>
			</section>

			{#if data.plan}
				{@const s = data.plan.summary}
				<section aria-labelledby="available-heading">
					<Card>
						<div class="available">
							{#if s}
								<h2 id="available-heading">Disponible para gastar · {data.plan.monthName}</h2>
								<p class="available-amount">
									<Money cents={s.available} currency={data.currency} />
								</p>
								<p class="status {s.status}">{data.plan.statusLabel}</p>
								<p class="muted per-day">
									<Money cents={s.perDay} currency={data.currency} /> por día · quedan {s.daysLeft}
									{s.daysLeft === 1 ? 'día' : 'días'}
								</p>
								<a class="all" href={resolve('/plan')}>Ver plan</a>
							{:else}
								<h2 id="available-heading">Disponible para gastar</h2>
								{#if data.plan.endedMonthName}
									<p class="strong">Tu plan de {data.plan.endedMonthName} terminó.</p>
								{/if}
								<p class="strong">Todavía no tenés un plan en {currencyName[data.currency]}.</p>
								<p class="muted per-day">
									Con tus ingresos, pagos fijos y ahorro calculamos cuánto podés gastar por día.
								</p>
								<Button href={resolve('/plan/setup')}>Crear plan</Button>
							{/if}
						</div>
					</Card>
				</section>
			{/if}

			<section aria-labelledby="categories-heading">
				<h2 id="categories-heading">Principales categorías</h2>
				{#if data.topCategories.length === 0}
					<p class="muted">Sin gastos este mes</p>
				{:else}
					<Card>
						<ul class="list">
							{#each data.topCategories as cat (cat.id)}
								<li class="cat">
									<div class="cat-row">
										<span class="ellipsis">{cat.name}</span>
										<span class="amount">{formatMoney(cat.net, data.currency)}</span>
										<span class="amount muted pct">{percent.format(cat.share)}</span>
									</div>
									<div class="track">
										<div class="fill" style:width={`${cat.share * 100}%`}></div>
									</div>
								</li>
							{/each}
						</ul>
					</Card>
				{/if}
			</section>

			<section aria-labelledby="recent-heading">
				<div class="section-head">
					<h2 id="recent-heading">Últimos movimientos</h2>
					{#if data.recent.length > 0}
						<a class="all" href={resolve(`/movements?currency=${data.currency}`)}>Ver todos</a>
					{/if}
				</div>
				{#if data.recent.length === 0}
					<p class="muted">Sin movimientos</p>
				{:else}
					<ul class="list-card">
						{#each data.recent as m (m.id)}
							<li>
								<MovementRow
									m={{
										...m,
										subtitle: `${m.dateLabel} · ${
											m.type === 'transfer'
												? `${m.accountName} → ${m.destinationAccountName}`
												: m.accountName
										}${m.categoryName ? ` · ${m.categoryName}` : ''}`
									}}
								/>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	{/if}
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.empty-action {
		display: flex;
		justify-content: center;
	}

	.label,
	.muted {
		color: var(--text-muted);
	}

	.label {
		font-size: var(--font-size-sm);
	}

	.hero-amount {
		font-size: clamp(1.5rem, 9vw, var(--font-size-hero));
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.2;
	}

	.month {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-1) var(--space-3);
		margin-top: var(--space-2);
		padding-top: var(--space-2);
		border-top: 1px solid var(--border);
	}

	.available {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
	}

	.available h2 {
		margin-bottom: 0;
	}

	.available-amount {
		font-size: var(--font-size-xl);
		font-weight: 600;
		line-height: 1.2;
		max-width: 100%;
		overflow-wrap: anywhere;
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
	}

	.strong {
		font-weight: 600;
	}

	.net {
		font-size: var(--font-size-lg);
		font-weight: 600;
		line-height: 1.2;
	}

	h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
		margin-bottom: var(--space-2);
	}

	.section-head h2 {
		margin-bottom: 0;
	}

	.list {
		list-style: none;
		padding: 0;
	}

	.ellipsis {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cat {
		padding: var(--space-2) 0;
	}

	.cat:first-child {
		padding-top: 0;
	}

	.cat:last-child {
		padding-bottom: 0;
	}

	.cat-row {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		margin-bottom: var(--space-1);
	}

	.cat-row .ellipsis {
		flex: 1;
	}

	.cat-row .amount {
		white-space: normal;
		overflow-wrap: anywhere;
	}

	.pct {
		min-width: 3ch;
		text-align: right;
		font-size: var(--font-size-sm);
	}

	.track {
		height: 0.5rem;
		border-radius: var(--radius-pill);
		overflow: hidden;
		background: var(--border);
	}

	.fill {
		height: 100%;
		background: color-mix(in srgb, var(--primary) 70%, transparent);
	}

	.all {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		font-weight: 500;
		font-size: var(--font-size-sm);
		color: var(--text);
		text-decoration: underline;
	}
</style>
