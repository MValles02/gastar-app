<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import CurrencyTabs from '$lib/components/CurrencyTabs.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
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

	{#if !data.hasCurrency}
		<EmptyState icon="accounts">No tenés cuentas en {currencyName[data.currency]}.</EmptyState>
		<div class="center"><Button href={resolve('/accounts/new')}>Crear cuenta</Button></div>
	{:else if !data.incomes.length && !data.outcomes.length && !data.inactive.length}
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
