<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { autosave, submitAction } from '$lib/autosave';
	import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
	import { navigateUp, upOnClick } from '$lib/nav-stack.svelte';
	import { formatAmountInput, formatMoney } from '$lib/money';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import InlineText from '$lib/components/InlineText.svelte';
	import Money from '$lib/components/Money.svelte';
	import MovementDatePicker from '$lib/components/MovementDatePicker.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import type { PageData } from '../../routes/(app)/movements/[id]/$types';

	/**
	 * A movement's detail and edit in one: tapping a field changes it, and every change saves on its own
	 * (`?/update`) with a Deshacer toast. `drawer` lives over the list (shallow route); `page` is the
	 * full /movements/<id> page. The type is never editable.
	 */
	let {
		data,
		variant,
		onclose
	}: { data: PageData; variant: 'page' | 'drawer'; onclose?: () => void } = $props();

	type Movement = PageData['movement'];
	const drawer = $derived(variant === 'drawer');

	let m = $state<Movement>(untrack(() => data.movement));

	// What the update action stores, as the strings it takes (same as `formValues` on the server).
	const values = $derived<Record<string, string>>({
		occurredAt: m.occurredAt,
		description: m.description,
		amount: formatAmountInput(m.amount, m.accountCurrency),
		accountId: m.accountId,
		destinationAccountId: m.destinationAccountId ?? '',
		categoryId: m.categoryId ?? '',
		exchangeRate: m.exchangeRate !== null ? formatAmountInput(m.exchangeRate, 'ARS') : ''
	});

	const isTransfer = $derived(m.type === 'transfer');
	const archived = (name: string, is: boolean) => (is ? `${name} · Archivada` : name);
	const accounts = $derived(
		data.accounts.map((a) => ({ ...a, name: archived(a.name, a.archived), archived: false }))
	);
	const categories = $derived(
		data.categories
			.filter((c) => c.kind === null || c.kind === m.type || c.id === m.categoryId)
			.map((c) => ({ ...c, name: archived(c.name, c.archived), archived: false }))
	);

	// Picker rows report their error here, keyed by field.
	let errors = $state<Record<string, string>>({});
	// An account change that needs a Cotización first (cross-currency, none stored): it waits here and
	// is saved together with the rate.
	let pending = $state<Record<string, string>>({});
	const originId = $derived(pending.accountId ?? m.accountId);
	const destinationId = $derived(pending.destinationAccountId ?? m.destinationAccountId ?? '');
	const currencyOf = (id: string) => data.accounts.find((a) => a.id === id)?.currency;
	const crossCurrency = $derived(
		isTransfer && !!destinationId && currencyOf(originId) !== currencyOf(destinationId)
	);

	const path = $derived(resolve(`/movements/${m.id}`));

	function save(fields: Record<string, string>) {
		// A transfer's account change can drop its rate: undo restores the whole prior state.
		const touchesAccount = 'accountId' in fields || 'destinationAccountId' in fields;
		const keys = [
			...Object.keys(fields),
			...(isTransfer && touchesAccount
				? ['accountId', 'destinationAccountId', 'exchangeRate', 'amount']
				: [])
		];
		const previous = Object.fromEntries(keys.map((k) => [k, values[k]]));
		return autosave<{ movement: Movement }>({
			path: `${path}?/update`,
			fields,
			previous,
			apply: (r) => {
				m = r.movement;
				pending = {};
				errors = {};
			}
		});
	}

	async function saveField(key: string, value: string) {
		if (value === values[key]) return;
		errors[key] = (await save({ [key]: value })) ?? '';
	}

	async function saveAccount(key: 'accountId' | 'destinationAccountId', id: string) {
		if (id === (pending[key] ?? values[key])) return;
		if (id === values[key]) {
			delete pending[key];
			return;
		}
		const other = key === 'accountId' ? destinationId : originId;
		if (isTransfer && !m.exchangeRate && other && currencyOf(id) !== currencyOf(other)) {
			pending[key] = id;
			return;
		}
		errors[key] = (await save({ ...pending, [key]: id })) ?? '';
	}

	// Same text as the server (src/lib/server/movements.ts).
	const RATE_MESSAGE = 'Ingresá la cotización (1 USD = X ARS) en pesos enteros y mayor a cero.';
	const staged = $derived(Object.keys(pending).length > 0);
	// Closing with an account change still waiting for its Cotización drops it: say so.
	$effect(() => () => {
		if (Object.keys(untrack(() => pending)).length)
			toast.error('No se guardó el cambio de cuenta.');
	});

	const saveRate = (next: string) => save({ ...pending, exchangeRate: next });

	async function remove() {
		const r = await submitAction(`${path}?/delete`, {});
		if (r.type !== 'redirect') {
			errors.delete = 'No se pudo eliminar el movimiento.';
			return;
		}
		// refreshAll keeps the drawer's shallow-route state (invalidateAll would reset it).
		await refreshAll();
		if (drawer) onclose?.();
		else await navigateUp(resolve('/movements'), { refresh: true });
	}
</script>

{#snippet empty()}<p class="hint">Todavía no hay opciones.</p>{/snippet}

<div class="detail" class:drawer>
	<div class="top">
		<h2 class="description">
			<InlineText
				label="Descripción"
				value={values.description}
				maxlength={DESCRIPTION_MAX_LENGTH}
				onsave={(next) => save({ description: next })}
			>
				{#snippet display()}{m.description}{/snippet}
			</InlineText>
		</h2>
		<div class="amount {m.type}">
			<InlineText
				label="Monto"
				inputmode="decimal"
				value={values.amount}
				onsave={(next) => save({ amount: next })}
			>
				{#snippet display()}
					<Money cents={m.amount} currency={m.accountCurrency} tone="flow" direction={m.type} />
				{/snippet}
			</InlineText>
		</div>
	</div>

	<ul class="card">
		<li>
			<MovementDatePicker
				name="occurredAt"
				label="Fecha"
				min="2000-01-01"
				bind:value={() => values.occurredAt, (v) => void saveField('occurredAt', v)}
				plain
				nested={drawer}
				error={errors.occurredAt}
				errorId="date-error"
			/>
		</li>
		<li>
			<OptionPicker
				variant="row"
				name="accountId"
				legend={isTransfer ? 'Desde' : 'Cuenta'}
				title={isTransfer ? 'Desde' : 'Cuenta'}
				items={accounts}
				bind:value={() => originId, (v) => void saveAccount('accountId', v)}
				nested={drawer}
				placeholder="Elegir"
				error={errors.accountId}
				errorId="account-error"
				{empty}
			/>
		</li>
		{#if isTransfer}
			<li>
				<OptionPicker
					variant="row"
					name="destinationAccountId"
					legend="Hacia"
					title="Hacia"
					items={accounts}
					bind:value={() => destinationId, (v) => void saveAccount('destinationAccountId', v)}
					excludeId={originId}
					nested={drawer}
					placeholder="Elegir"
					error={errors.destinationAccountId}
					errorId="destination-error"
					{empty}
				/>
			</li>
			{#if crossCurrency}
				<li>
					<p class="row" aria-live="polite">
						<span class="k">En destino</span>
						<span class="v">
							{#if m.destinationAmount !== null && m.destinationCurrency && !pending.accountId && !pending.destinationAccountId}
								{formatMoney(m.destinationAmount, m.destinationCurrency)}
							{:else}—{/if}
						</span>
					</p>
				</li>
				<li>
					<div class="row">
						<span class="k">Cotización</span>
						<span class="v">
							<InlineText
								label="Cotización"
								inputmode="numeric"
								prefix="1 USD = $"
								value={values.exchangeRate}
								open={staged}
								required={staged}
								onsave={saveRate}
							>
								{#snippet display()}
									1 USD = {m.exchangeRate !== null ? formatMoney(m.exchangeRate, 'ARS') : '$'}
								{/snippet}
							</InlineText>
						</span>
					</div>
					{#if staged}<p class="staged" role="alert">{RATE_MESSAGE}</p>{/if}
				</li>
			{/if}
		{:else}
			<li>
				<OptionPicker
					variant="row"
					name="categoryId"
					legend="Categoría"
					title="Categoría"
					items={categories}
					bind:value={() => values.categoryId, (v) => void saveField('categoryId', v)}
					nested={drawer}
					placeholder="Elegir"
					error={errors.categoryId}
					errorId="category-error"
					{empty}
				/>
			</li>
		{/if}
	</ul>

	{#if errors.delete}<p class="error" role="alert">{errors.delete}</p>{/if}
	<div class="actions">
		{#if drawer}
			<AlertDialog.Root>
				<AlertDialog.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="destructive" class="w-full">Eliminar</Button>
					{/snippet}
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>¿Eliminar este movimiento?</AlertDialog.Title>
						<AlertDialog.Description>Esta acción no se puede deshacer.</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer class="m-0 grid grid-cols-2 border-0 bg-transparent p-0">
						<AlertDialog.Cancel type="button" class="w-full">Cancelar</AlertDialog.Cancel>
						<AlertDialog.Action type="button" variant="destructive" class="w-full" onclick={remove}
							>Eliminar</AlertDialog.Action
						>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>
		{:else if !drawer}
			<ConfirmDialog
				triggerLabel="Eliminar"
				triggerVariant="destructive"
				triggerClass="w-full"
				title="¿Eliminar este movimiento?"
				confirmLabel="Eliminar"
				action="?/delete"
			>
				Esta acción no se puede deshacer.
			</ConfirmDialog>
		{/if}
		{#if drawer}
			<Button class="w-full" onclick={() => onclose?.()}>Listo</Button>
		{:else}
			<Button class="w-full" href={resolve('/movements')} onclick={upOnClick('/movements')}
				>Listo</Button
			>
		{/if}
	</div>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.detail.drawer {
		min-height: 0;
		overflow-y: auto;
		padding: var(--space-1) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
	}

	.top {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		text-align: center;
	}

	.description {
		margin: 0;
		max-width: 100%;
		font-size: var(--font-size-lg);
		font-weight: 600;
		line-height: 1.3;
	}

	.amount {
		max-width: 100%;
		font-family: var(--font-display);
		font-size: var(--font-size-hero);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.amount.outcome {
		color: var(--negative);
	}

	.amount.income {
		color: var(--positive);
	}

	.amount.transfer {
		color: var(--transfer);
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

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3.5rem;
		margin: 0;
		padding: 0 var(--space-4);
		font-size: var(--font-size-base);
	}

	.v {
		min-width: 0;
		text-align: right;
		font-weight: 500;
	}

	.staged {
		padding: 0 var(--space-4) var(--space-3);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.hint {
		padding: var(--space-4);
		color: var(--text-muted);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}
</style>
