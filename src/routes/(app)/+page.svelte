<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import { formatMoney } from '$lib/money';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const percent = new Intl.NumberFormat('es-AR', { style: 'percent' });

	const tone = (n: number) => (n > 0 ? 'positive' : n < 0 ? 'negative' : '');
</script>

<svelte:head>
	<title>Gastar</title>
</svelte:head>

<h1 class="visually-hidden">Inicio</h1>

<div class="dashboard">
	{#if !data.hasAnyAccount}
		<EmptyState icon="accounts">
			Todavía no tenés cuentas. Creá la primera para empezar a registrar tus movimientos.
		</EmptyState>
		<div class="empty-action">
			<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
		</div>
	{:else if data.blocks.length === 0}
		<EmptyState icon="accounts">No tenés cuentas en {data.pref}.</EmptyState>
		<div class="empty-action">
			<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
		</div>
	{:else}
		{#each data.blocks as b (b.currency)}
			<section aria-labelledby="balance-{b.currency}">
				<Card>
					<p id="balance-{b.currency}" class="label">
						Saldo total{data.pref === 'both' ? ` ${b.currency}` : ''}
					</p>
					<p class="amount hero-amount">{formatMoney(b.balance, b.currency)}</p>
					<div class="month">
						<p class="label">
							<span class="visually-hidden">Balance del mes: </span>{data.month.label}
						</p>
						<p class="amount net {tone(b.monthNet)}">
							{formatMoney(b.monthNet, b.currency)}
						</p>
					</div>
				</Card>
			</section>

			<section aria-labelledby="categories-{b.currency}">
				<h2 id="categories-{b.currency}">
					Principales categorías{data.pref === 'both' ? ` ${b.currency}` : ''}
				</h2>
				{#if b.topCategories.length === 0}
					<p class="muted">Sin gastos este mes</p>
				{:else}
					<Card>
						<ul class="list">
							{#each b.topCategories as cat (cat.id)}
								<li class="cat">
									<div class="cat-row">
										<span class="ellipsis">{cat.name}</span>
										<span class="amount">{formatMoney(cat.net, b.currency)}</span>
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
		{/each}

		<section aria-labelledby="recent-heading">
			<h2 id="recent-heading">Últimos movimientos</h2>
			{#if data.recent.length === 0}
				<p class="muted">Sin movimientos</p>
			{:else}
				<ul class="list-card">
					{#each data.recent as m (m.id)}
						<li>
							<ListRow href={resolve(`/movements/${m.id}`)}>
								{#snippet title()}{m.description}{/snippet}
								{#snippet subtitle()}
									{m.dateLabel} · {m.type === 'transfer'
										? `${m.accountName} → ${m.destinationAccountName}`
										: m.accountName}{m.categoryName ? ` · ${m.categoryName}` : ''}
								{/snippet}
								{#snippet trailing()}
									<span class="amount row-amount {m.sign === 'neutral' ? 'transfer' : m.sign}">
										{formatMoney(m.amount, m.currency, {
											sign: m.sign === 'positive' ? 'always' : 'auto'
										})}
									</span>
								{/snippet}
							</ListRow>
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

	.hero-amount {
		font-size: clamp(1.5rem, 9vw, var(--font-size-hero));
		font-weight: 600;
		line-height: 1.2;
		white-space: normal;
		overflow-wrap: anywhere;
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

	.net {
		font-size: var(--font-size-lg);
		font-weight: 600;
		line-height: 1.2;
		white-space: normal;
		overflow-wrap: anywhere;
	}

	.positive {
		color: var(--positive);
	}

	.negative {
		color: var(--negative);
	}

	.transfer {
		color: var(--transfer);
	}

	h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
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

	.row-amount {
		white-space: nowrap;
		font-weight: 500;
	}

	.all {
		margin-top: var(--space-2);
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		font-weight: 500;
		color: var(--text);
		text-decoration: underline;
	}
</style>
