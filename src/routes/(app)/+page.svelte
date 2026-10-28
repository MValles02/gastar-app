<script lang="ts">
	import { LOCALE } from '$lib/locale';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import CurrencyTabs from '$lib/components/CurrencyTabs.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import CardEyebrow from '$lib/components/CardEyebrow.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Meter from '$lib/components/Meter.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import Money from '$lib/components/Money.svelte';
	import HeroAmount from '$lib/components/HeroAmount.svelte';
	import MovementRow from '$lib/components/MovementRow.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import { PLAN_TONE } from '$lib/status';
	import { swatchVar, toSwatchKey } from '$lib/appearance';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const percent = new Intl.NumberFormat(LOCALE, { style: 'percent' });
</script>

<svelte:head>
	<title>Gastar</title>
</svelte:head>

<PageHeader title="Hola, {data.header.firstName}" />

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
						<Money cents={data.monthNet} currency={data.currency} tone="flow" />
					</span>
				</div>
			{/snippet}

			<section aria-labelledby="summary-heading">
				<Card.Root class="gap-0 overflow-hidden py-0">
					{#if data.plan?.summary}
						{@const s = data.plan.summary}
						<div class="box">
							<div class="top">
								<CardEyebrow as="h2" id="summary-heading">Disponible</CardEyebrow>
								<StatusPill tone={PLAN_TONE[s.status]} label={data.plan.statusLabel} />
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
							<div class="top">
								<CardEyebrow as="h2" id="summary-heading">Saldo</CardEyebrow>
							</div>
							<HeroAmount cents={data.balance} currency={data.currency} />
						</div>
						<div class="sub">{@render monthNet()}</div>
						<div class="no-plan">
							{#if data.plan?.endedMonthName}
								<p class="strong">Terminó el plan de {data.plan.endedMonthName}.</p>
							{/if}
							<Button href={resolve('/plan/setup')} variant="outline">Crear plan</Button>
						</div>
					{/if}
				</Card.Root>
			</section>

			<section aria-labelledby="categories-heading">
				<SectionHeader id="categories-heading" title="Categorías" />
				{#if data.topCategories.length === 0}
					<Card.Root>
						<Card.Content><p class="muted inline-empty">Sin gastos</p></Card.Content>
					</Card.Root>
				{:else}
					<ListCard>
						{#each data.topCategories as cat (cat.id)}
							{#snippet catValue()}
								<Money
									cents={cat.net}
									currency={data.currency}
									tone="flow"
									direction={cat.net < 0 ? 'income' : 'outcome'}
								/>
							{/snippet}
							{#snippet catMeta()}{percent.format(cat.share)}{/snippet}
							{#snippet catFooter()}
								<Meter percent={cat.share * 100} color={swatchVar(cat.color)} />
							{/snippet}
							<ListRow
								lead={{
									icon: cat.icon ?? undefined,
									letter: cat.icon ? undefined : cat.name.charAt(0).toUpperCase(),
									color: toSwatchKey(cat.color)
								}}
								title={cat.name}
								value={catValue}
								meta={catMeta}
								footer={catFooter}
							/>
						{/each}
					</ListCard>
				{/if}
			</section>

			<section aria-labelledby="recent-heading">
				<SectionHeader
					id="recent-heading"
					title="Movimientos"
					action={data.recent.length > 0
						? { href: `/movements?currency=${data.currency}`, label: 'Ver todos' }
						: undefined}
				/>
				{#if data.recent.length === 0}
					<Card.Root>
						<Card.Content><p class="muted inline-empty">Sin movimientos</p></Card.Content>
					</Card.Root>
				{:else}
					<ListCard>
						{#each data.recent as m (m.id)}
							<MovementRow {m} date={m.dateLabel} />
						{/each}
					</ListCard>
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

	.inline-empty {
		display: flex;
		align-items: center;
		min-height: 2rem;
		font-size: var(--font-size-sm);
	}
</style>
