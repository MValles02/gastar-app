<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import { formatMoney } from '$lib/money';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selected = $derived<string>(data.currency);
	let currencyForm: HTMLFormElement;

	const currencyOptions = [
		{ value: 'ARS', label: 'ARS' },
		{ value: 'USD', label: 'USD' }
	];

	const percent = new Intl.NumberFormat('es-AR', { style: 'percent' });

	const tone = (n: number) => (n > 0 ? 'positive' : n < 0 ? 'negative' : '');
</script>

<svelte:head>
	<title>Gastar</title>
</svelte:head>

<h1 class="visually-hidden">Inicio</h1>

<div class="dashboard">
	<form
		method="post"
		action="?month={data.month.value}&/currency"
		bind:this={currencyForm}
		use:enhance={() => {
			return async ({ update }) => {
				await update({ reset: false });
				currencyForm.querySelector<HTMLInputElement>('input:checked')?.focus();
			};
		}}
	>
		<SegmentedControl
			name="currency"
			options={currencyOptions}
			bind:value={selected}
			onchange={() => currencyForm.requestSubmit()}
		/>
		<noscript><Button type="submit" variant="secondary">Guardar</Button></noscript>
		{#if form?.error}
			<p class="error" role="alert">{form.error}</p>
		{/if}
	</form>

	{#if !data.hasAnyAccount}
		<EmptyState icon="accounts">
			Todavía no tenés cuentas. Creá la primera para empezar a registrar tus movimientos.
		</EmptyState>
		<div class="empty-action">
			<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
		</div>
	{:else if !data.hasCurrencyAccount}
		<EmptyState icon="accounts">No tenés cuentas en {data.currency}.</EmptyState>
	{:else}
		<section class="hero" aria-labelledby="balance-label">
			<p id="balance-label" class="label">Saldo total</p>
			<p class="amount hero-amount">{formatMoney(data.totalBalance, data.currency)}</p>
		</section>

		<section class="month">
			<div class="nav">
				<a class="arrow" href={resolve(`/?month=${data.month.prev}`)} aria-label="Mes anterior">
					<Icon name="chevron-left" />
				</a>
				<p class="month-label">{data.month.label}</p>
				<a class="arrow" href={resolve(`/?month=${data.month.next}`)} aria-label="Mes siguiente">
					<Icon name="chevron-right" />
				</a>
			</div>
			<p class="label">Balance del mes</p>
			<p class="amount net {tone(data.monthNet)}">{formatMoney(data.monthNet, data.currency)}</p>
		</section>

		<section aria-labelledby="categories-heading">
			<h2 id="categories-heading">Principales categorías</h2>
			{#if data.topCategories.length === 0}
				<p class="muted">Sin gastos este mes</p>
			{:else}
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
			{/if}
		</section>

		<section aria-labelledby="recent-heading">
			<h2 id="recent-heading">Últimos movimientos</h2>
			{#if data.recent.length === 0}
				<p class="muted">Sin movimientos</p>
			{:else}
				<ul class="list">
					{#each data.recent as m (m.id)}
						<li>
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the movement detail route is not built yet -->
							<a class="row" href={`/movements/${m.id}`}>
								<span class="row-main">
									<span class="ellipsis">{m.description}</span>
									<span class="muted small ellipsis">
										{m.dateLabel} · {m.type === 'transfer'
											? `${m.accountName} → ${m.destinationAccountName}`
											: m.accountName}{m.categoryName ? ` · ${m.categoryName}` : ''}
									</span>
								</span>
								<span class="amount row-amount {m.sign === 'neutral' ? '' : m.sign}">
									{formatMoney(m.amount, data.currency, {
										sign: m.sign === 'positive' ? 'always' : 'auto'
									})}
								</span>
							</a>
						</li>
					{/each}
				</ul>
				<a class="all" href={resolve('/movements')}>Ver todos</a>
			{/if}
		</section>
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

	.small {
		font-size: var(--font-size-sm);
	}

	.hero-amount {
		font-size: clamp(1.5rem, 9vw, var(--font-size-hero));
		font-weight: 500;
		line-height: 1.2;
		white-space: nowrap;
	}

	.month {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: var(--space-3) var(--space-4) var(--space-4);
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-3);
	}

	.month-label {
		font-weight: 500;
	}

	.arrow {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: var(--radius-pill);
		color: var(--text);
		transition: background-color 0.15s ease;
	}

	a.arrow:hover {
		background: color-mix(in srgb, var(--primary) 8%, transparent);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.net {
		font-size: var(--font-size-lg);
		font-weight: 500;
		white-space: nowrap;
	}

	.positive {
		color: var(--positive);
	}

	.negative {
		color: var(--negative);
	}

	h2 {
		font-size: var(--font-size-base);
		margin-bottom: var(--space-2);
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
		white-space: nowrap;
	}

	.pct {
		min-width: 3ch;
		text-align: right;
		font-size: var(--font-size-sm);
	}

	.track {
		height: 2px;
		background: var(--border);
	}

	.fill {
		height: 100%;
		background: color-mix(in srgb, var(--primary) 60%, transparent);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 2.75rem;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--border);
		text-decoration: none;
	}

	.row-main {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.row-amount {
		white-space: nowrap;
		font-weight: 500;
	}

	.all {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		font-weight: 500;
		color: var(--primary);
	}
</style>
