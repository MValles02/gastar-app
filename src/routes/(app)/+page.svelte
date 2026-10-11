<script lang="ts">
	import { CURRENCY_NAME } from '$lib/money';
	import { LOCALE } from '$lib/locale';
	import { resolve } from '$app/paths';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Clock from '@lucide/svelte/icons/clock';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import CurrencyTabs from '$lib/components/CurrencyTabs.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import Money from '$lib/components/Money.svelte';
	import HeroAmount from '$lib/components/HeroAmount.svelte';
	import MovementRow from '$lib/components/MovementRow.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { formatMoney } from '$lib/money';
	import * as Item from '$lib/components/ui/item/index.js';
	import { swatchVar } from '$lib/appearance';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const percent = new Intl.NumberFormat(LOCALE, { style: 'percent' });
	const statusIcon = { ok: Check, warn: Clock, over: CircleAlert } as const;

	// Past 11 characters ("$ 12.345.678") the hero steps down so it never wraps or truncates.
</script>

<svelte:head>
	<title>Gastar</title>
</svelte:head>

<PageHeader title="Hola, {data.header.firstName}" collapse />

<div class="dashboard">
	{#if !data.hasAnyAccount}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon"><Icon name="accounts" size="1rem" /></Empty.Media>
				<Empty.Description>Sin cuentas.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
		<div class="empty-action">
			<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
		</div>
	{:else}
		<CurrencyTabs value={data.currency} />

		{#if !data.hasCurrencyAccount}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Icon name="accounts" size="1rem" /></Empty.Media>
					<Empty.Description>Sin cuentas en {data.currency}.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
			<div class="empty-action">
				<Button href={resolve('/accounts/new')}>Crear cuenta</Button>
			</div>
		{:else}
			{#snippet monthNet()}
				<div class="kv">
					<span class="k">Mes actual</span>
					<span class="am net">
						<Money
							cents={data.monthNet}
							currency={data.currency}
							kind={data.monthNet > 0 ? 'income' : 'plain'}
						/>
					</span>
				</div>
			{/snippet}

			<section aria-labelledby="summary-heading">
				<Card.Root class="gap-0 overflow-hidden py-0">
					{#if data.plan?.summary}
						{@const s = data.plan.summary}
						{@const Status = statusIcon[s.status]}
						<div class="box">
							<div class="top">
								<h2 id="summary-heading" class="eyebrow">Disponible</h2>
								<span class="pill {s.status}">
									<Status size={14} strokeWidth={2} />
									{data.plan.statusLabel}
								</span>
							</div>
							<HeroAmount class="available-amount" cents={s.available} currency={data.currency} />
							<p class="muted per-day">
								<Money cents={s.perDay} currency={data.currency} />/día · {s.daysLeft}
								{s.daysLeft === 1 ? 'día' : 'días'}
							</p>
						</div>
						<div class="sub">
							<div class="kv">
								<span class="k">Saldo</span>
								<span class="am"><Money cents={data.balance} currency={data.currency} /></span>
							</div>
							{@render monthNet()}
						</div>
						<a class="footer" href={resolve('/plan')}>
							Ver plan
							<Icon name="chevron-right" size="1.25rem" />
						</a>
					{:else}
						<div class="box">
							<h2 id="summary-heading" class="eyebrow">Saldo</h2>
							<HeroAmount cents={data.balance} currency={data.currency} />
						</div>
						<div class="sub">{@render monthNet()}</div>
						<div class="no-plan">
							<p class="eyebrow">Disponible</p>
							{#if data.plan?.endedMonthName}
								<p class="strong">Terminó el plan de {data.plan.endedMonthName}.</p>
							{/if}
							<p class="strong">Sin plan en {CURRENCY_NAME[data.currency]}.</p>
							<Button href={resolve('/plan/setup')} variant="outline">Crear plan</Button>
						</div>
					{/if}
				</Card.Root>
			</section>

			<section aria-labelledby="categories-heading">
				<div class="section-head"><h2 id="categories-heading">Categorías</h2></div>
				{#if data.topCategories.length === 0}
					<Card.Root>
						<Card.Content><p class="muted inline-empty">Sin gastos</p></Card.Content>
					</Card.Root>
				{:else}
					<Card.Root>
						<Card.Content>
							<ul class="list">
								{#each data.topCategories as cat (cat.id)}
									<li class="cat" style:--tone={swatchVar(cat.color)}>
										<div class="cat-row">
											<span class="dot" aria-hidden="true"></span>
											<span class="ellipsis">{cat.name}</span>
											<span class="amount cat-amount">{formatMoney(cat.net, data.currency)}</span>
											<span class="amount muted pct">{percent.format(cat.share)}</span>
										</div>
										<div class="track">
											<div class="fill" style:width={`${cat.share * 100}%`}></div>
										</div>
									</li>
								{/each}
							</ul>
						</Card.Content>
					</Card.Root>
				{/if}
			</section>

			<section aria-labelledby="recent-heading">
				<div class="section-head">
					<h2 id="recent-heading">Movimientos</h2>
					{#if data.recent.length > 0}
						<a class="all" href={resolve(`/movements?currency=${data.currency}`)}>Ver todos</a>
					{/if}
				</div>
				{#if data.recent.length === 0}
					<Card.Root>
						<Card.Content><p class="muted inline-empty">Sin movimientos</p></Card.Content>
					</Card.Root>
				{:else}
					<Item.Group
						class="gap-0 overflow-hidden rounded-(--radius-card) border border-(--border) bg-(--surface) shadow-(--shadow-1)"
					>
						{#each data.recent as m (m.id)}
							<div role="listitem">
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
							</div>
						{/each}
					</Item.Group>
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

	.muted {
		color: var(--text-muted);
	}

	.strong {
		font-weight: 500;
	}

	.eyebrow {
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	/* Summary card */
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
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.625rem;
		border-radius: var(--radius-pill);
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

	/* Over budget is information, not an error: inverted fill, never red. */
	.pill.over {
		background: var(--text);
		color: var(--bg);
	}

	.sub {
		padding: 0 1.25rem;
		border-top: 1px solid var(--border);
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

	.k {
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text-muted);
	}

	.am {
		font-size: 1.0625rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
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
		padding: 1.25rem;
		border-top: 1px solid var(--border);
	}

	/* Sections */
	h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	.section-head {
		margin-bottom: var(--space-2);
	}

	.inline-empty {
		display: flex;
		align-items: center;
		min-height: 2rem;
		font-size: var(--font-size-sm);
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
		padding: var(--space-3) 0;
	}

	.cat + .cat {
		border-top: 1px solid var(--border);
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
		margin-bottom: var(--space-2);
		font-weight: 500;
	}

	.cat-row .ellipsis {
		flex: 1;
	}

	.cat-amount {
		white-space: normal;
		overflow-wrap: anywhere;
		font-weight: 600;
	}

	.pct {
		min-width: 3ch;
		text-align: right;
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.track {
		height: 0.375rem;
		border-radius: var(--radius-pill);
		overflow: hidden;
		background: var(--muted);
	}

	/* The category swatch tints the dot and bar; text stays on tokens. */
	.dot {
		flex: none;
		align-self: center;
		width: 0.625rem;
		height: 0.625rem;
		border-radius: var(--radius-pill);
		background: var(--tone);
	}

	.fill {
		height: 100%;
		border-radius: var(--radius-pill);
		background: var(--tone);
	}

	.all {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		font-weight: 500;
		font-size: var(--font-size-sm);
		color: var(--text);
		text-decoration: underline;
	}
</style>
