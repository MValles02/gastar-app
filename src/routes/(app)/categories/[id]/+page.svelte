<script lang="ts">
	import type { Currency } from '$lib/money';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { SWATCHES, toSwatchKey } from '$lib/appearance';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import MonthNav from '$lib/components/MonthNav.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import * as Item from '$lib/components/ui/item/index.js';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Money from '$lib/components/Money.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const c = $derived(data.category);
	const colorLabel = $derived(SWATCHES.find((s) => s.key === c.color)?.label ?? c.color);
	const single = $derived(data.nets.length === 1 ? data.nets[0] : null);
	const labelId = $props.id();
</script>

<!-- Net spend (outcomes - incomes) as a cash flow: spend in red, net income in green. -->
{#snippet flow(net: number, currency: Currency)}
	<Money cents={-net} {currency} kind={net < 0 ? 'income' : 'plain'} />
{/snippet}

<svelte:head>
	<title>{c.name} · Gastar</title>
</svelte:head>

<div class="detail">
	<PageHeader
		title={c.name}
		back={{ href: resolve('/categories'), label: 'Volver a categorías' }}
	/>

	<section aria-labelledby={labelId}>
		<Card.Root>
			<Card.Content>
				<div class="month-nav">
					<MonthNav
						label={data.month.label}
						prevHref={resolve(`/categories/${c.id}?month=${data.month.prev}`)}
						nextHref={data.month.isCurrent
							? null
							: resolve(`/categories/${c.id}?month=${data.month.next}`)}
					/>
				</div>

				<div class="hero">
					<IconBadge letter={c.name[0]} color={toSwatchKey(c.color)} size="3rem" />
					<p id={labelId} class="label">{data.month.isCurrent ? 'Este mes' : 'Balance del mes'}</p>
					{#if single}
						<p class="value">{@render flow(single.net, single.currency)}</p>
					{:else if data.nets.length === 0}
						<p class="muted">Sin movimientos en este mes.</p>
					{:else}
						<dl class="duo">
							{#each data.nets as n (n.currency)}
								<div>
									<dt>{n.currency}</dt>
									<dd class="amount">{@render flow(n.net, n.currency)}</dd>
								</div>
							{/each}
						</dl>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</section>

	<dl class="detail-card data">
		<div class="item">
			<dt>Color</dt>
			<dd class="appearance">
				<IconBadge letter={c.name[0]} color={toSwatchKey(c.color)} size="1.75rem" />
				<span>{colorLabel}</span>
			</dd>
		</div>
		<div class="item">
			<dt>Estado</dt>
			<dd>{c.archived ? 'Archivada' : 'Activa'}</dd>
		</div>
	</dl>

	<Item.Group
		class="gap-0 overflow-hidden rounded-(--radius-card) border border-(--border) bg-(--surface) shadow-(--shadow-1)"
	>
		<div role="listitem">
			<Item.Root>
				{#snippet child({ props })}
					<a href={resolve(`/movements?category=${c.id}`)} {...props}>
						<Item.Content><Item.Title>Ver movimientos</Item.Title></Item.Content>
						<Item.Actions><Icon name="chevron-right" /></Item.Actions>
					</a>
				{/snippet}
			</Item.Root>
		</div>
	</Item.Group>

	{#if form?.error}
		<p class="error" role="alert"><Icon name="alert" size="1rem" />{form.error}</p>
	{/if}

	<div class="actions">
		{#if data.actions.canArchive}
			<p class="muted small">
				Tiene movimientos, así que no se puede eliminar. Podés archivarla para ocultarla.
			</p>
		{/if}
		<Button href={resolve(`/categories/${c.id}/edit`)} class="w-full">Editar</Button>
		{#if data.actions.canArchive}
			<form method="POST" action="?/archive" use:enhance>
				<Button type="submit" variant="outline" class="w-full">Archivar</Button>
			</form>
		{/if}
		{#if data.actions.canUnarchive}
			<form method="POST" action="?/unarchive" use:enhance>
				<Button type="submit" variant="outline" class="w-full">Desarchivar</Button>
			</form>
		{/if}
		{#if data.actions.canDelete}
			<ConfirmDialog
				triggerLabel="Eliminar"
				triggerVariant="destructive"
				title="¿Eliminar esta categoría?"
				confirmLabel="Eliminar"
				action="?/delete"
			>
				Esta acción no se puede deshacer.
			</ConfirmDialog>
		{/if}
	</div>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.month-nav {
		margin-bottom: var(--space-3);
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding-block: var(--space-2);
		text-align: center;
	}

	.label {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.value {
		max-width: 100%;
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 9vw, 2.75rem);
		font-weight: 500;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.duo {
		align-self: stretch;
		margin: 0;
	}

	.duo div {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.duo dd {
		font-family: var(--font-display);
		font-size: var(--font-size-xl, 1.5rem);
		font-weight: 500;
	}

	.muted {
		color: var(--text-muted);
	}

	.small {
		font-size: var(--font-size-sm);
		text-align: center;
	}

	.data {
		margin: 0;
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.item:last-child {
		border-bottom: 0;
	}

	dt {
		color: var(--text-muted);
	}

	dd {
		margin: 0;
		min-width: 0;
		text-align: right;
		overflow-wrap: anywhere;
	}

	.amount {
		white-space: nowrap;
	}

	.appearance {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 500;
	}

	.error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: var(--space-2);
	}

	.actions :global(.btn) {
		width: 100%;
	}
</style>
