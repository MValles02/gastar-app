<script lang="ts">
	import { untrack } from 'svelte';
	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { autosave, submitAction } from '$lib/autosave';
	import { swatchVar } from '$lib/appearance';
	import { formatAmountInput, formatMoney } from '$lib/money';
	import { navigateUp, upOnClick } from '$lib/nav-stack.svelte';
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import InlineText from '$lib/components/InlineText.svelte';
	import Meter from '$lib/components/Meter.svelte';
	import Money from '$lib/components/Money.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { PageData } from '../../routes/(app)/plan/limits/[categoryId]/$types';

	/**
	 * A category limit's detail and edit in one: the meter on top, the amount changes on tap and saves on
	 * its own (`?/update`) with a Deshacer toast; "Usar promedio" saves the same way. `drawer` lives over
	 * the plan (shallow route); `page` is the full /plan/limits/<id> page.
	 */
	let {
		data,
		variant,
		onclose,
		back = '/plan',
		wizard
	}: {
		data: PageData;
		variant: 'page' | 'drawer';
		onclose?: () => void;
		/** Page variant: where Listo and a delete go (unresolved path). */
		back?: string;
		/** Page variant: wizard step the limit was opened from (the delete returns there). */
		wizard?: number;
	} = $props();

	const drawer = $derived(variant === 'drawer');
	const currency = $derived(data.currency);
	const path = $derived(resolve(`/plan/limits/${data.category.id}` as '/'));

	// The limit in cents: set by a save or an undo (the preloaded drawer data does not reload).
	let cents = $state<number | null>(untrack(() => data.progress?.amount ?? null));
	const spent = $derived(data.progress?.spent ?? 0);
	const amountText = $derived(cents === null ? data.amount : formatAmountInput(cents, currency));
	const limit = $derived(cents ?? data.progress?.amount ?? 0);
	const over = $derived(spent > limit);
	// Same definition as the server's (plan.ts): within the limit but spending faster than the month elapses.
	const fast = $derived(limit > 0 && spent <= limit && spent / limit > data.elapsedShare);
	const pct = $derived(limit > 0 ? Math.min(100, Math.floor((spent * 100) / limit)) : 0);

	let error = $state('');

	async function save(next: string): Promise<string | null> {
		if (next === amountText) return null;
		error = '';
		// A failure shows under the amount (InlineText keeps the old value and the message).
		return autosave<{ amount: number }>({
			path: `${path}?/update`,
			fields: { amount: next },
			previous: { amount: amountText },
			apply: (res) => (cents = res.amount)
		});
	}

	async function remove() {
		const r = await submitAction(`${path}?/delete`, {});
		if (r.type !== 'redirect') {
			error = 'No se pudo eliminar el límite.';
			return;
		}
		// refreshAll keeps the drawer's shallow-route state (invalidateAll would reset it).
		await refreshAll();
		if (drawer) onclose?.();
		else await navigateUp(back, { refresh: true });
	}
</script>

{#snippet body()}
	<div class="detail">
		<div class="meter-block">
			<div class="line">
				<span class="who">
					<IconBadge icon={data.category.icon} color={data.category.color} size="1.5rem" />
					<span class="name">Límite de {data.category.name}</span>
				</span>
				{#if over}<StatusPill tone="bad" label="Te pasaste" />
				{:else if fast}<StatusPill tone="warning" label="Vas rápido" />{/if}
			</div>
			<p class="of">
				<span class="spent"><Money cents={spent} {currency} /></span> de
				<Money cents={limit} {currency} />
			</p>
			<Meter
				percent={pct}
				color={over ? 'var(--negative)' : swatchVar(data.category.color)}
				label="Límite de {data.category.name}"
				valueText="{formatMoney(spent, currency)} de {formatMoney(limit, currency)}"
			/>
		</div>

		<div class="amount">
			<InlineText label="Monto del límite" inputmode="decimal" value={amountText} onsave={save}>
				{#snippet display()}<Money cents={limit} {currency} />{/snippet}
			</InlineText>
			{#if data.suggested > 0 && data.suggested !== limit}
				<Button
					type="button"
					variant="ghost"
					class="average"
					onclick={async () => {
						const err = await save(formatAmountInput(data.suggested, currency));
						if (err) error = err;
					}}
				>
					Usar promedio · {formatMoney(data.suggested, currency)}
				</Button>
			{/if}
		</div>

		<ul class="card">
			<li class="static">
				<span>Categoría</span>
				<span class="value">
					<IconBadge icon={data.category.icon} color={data.category.color} size="1.5rem" />
					<span class="name">{data.category.name}</span>
				</span>
			</li>
			<li class="static">
				<span>Moneda</span>
				<span class="value">{currency === 'USD' ? 'Dólares' : 'Pesos'}</span>
			</li>
		</ul>

		{#if error}<p class="error" role="alert">{error}</p>{/if}

		<div class="actions">
			{#if drawer}
				<AlertDialog.Root>
					<AlertDialog.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="destructive" class="w-full">Eliminar límite</Button>
						{/snippet}
					</AlertDialog.Trigger>
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title>¿Eliminar este límite?</AlertDialog.Title>
							<AlertDialog.Description>Esta acción no se puede deshacer.</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer class="m-0 grid grid-cols-2 border-0 bg-transparent p-0">
							<AlertDialog.Cancel type="button" class="w-full">Cancelar</AlertDialog.Cancel>
							<AlertDialog.Action
								type="button"
								variant="destructive"
								class="w-full"
								onclick={remove}>Eliminar</AlertDialog.Action
							>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				</AlertDialog.Root>
				<Button class="w-full" onclick={() => onclose?.()}>Listo</Button>
			{:else}
				<ConfirmDialog
					triggerLabel="Eliminar límite"
					triggerVariant="destructive"
					triggerClass="w-full"
					title="¿Eliminar este límite?"
					confirmLabel="Eliminar"
					action="?/delete{wizard ? `&wizard=${wizard}` : ''}"
				>
					Esta acción no se puede deshacer.
				</ConfirmDialog>
				<Button class="w-full" href={resolve(back as '/')} onclick={upOnClick(resolve(back as '/'))}
					>Listo</Button
				>
			{/if}
		</div>
	</div>
{/snippet}

{#if drawer}
	<BottomDrawer
		title="Límite de {data.category.name}"
		hideTitle
		bare
		open
		onclose={() => onclose?.()}
	>
		{@render body()}
	</BottomDrawer>
{:else}
	{@render body()}
{/if}

<style>
	/* The modal drawer turns the page behind it pointer-events: none, toasts included: keep Deshacer clickable. */
	:global([data-sonner-toast]) {
		pointer-events: auto;
	}

	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding: var(--space-2) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
	}

	.meter-block {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.who {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		font-weight: 600;
	}

	.of {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.spent {
		color: var(--text);
		font-weight: 600;
	}

	.amount {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		font-family: var(--font-display);
		font-size: var(--font-size-hero);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.amount :global(.average) {
		font-family: var(--font-body);
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-decoration: underline;
	}

	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.static {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
	}

	.value {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		font-weight: 500;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.error {
		margin: 0;
		color: var(--negative);
		font-size: var(--font-size-sm);
		text-align: center;
	}

	.actions {
		display: grid;
		gap: var(--space-3);
	}
</style>
