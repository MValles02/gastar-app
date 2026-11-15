<script lang="ts">
	import { type ComponentProps, untrack } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { autosave, submitAction } from '$lib/autosave';
	import { MIN_DAY } from '$lib/dates';
	import { DESCRIPTION_MAX_LENGTH } from '$lib/fields';
	import { navigateUp, upOnClick } from '$lib/nav-stack.svelte';
	import { formatAmountInput, formatMoney } from '$lib/money';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import InlineText from '$lib/components/InlineText.svelte';
	import Money from '$lib/components/Money.svelte';
	import MovementDatePicker from '$lib/components/MovementDatePicker.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import type { PageData } from './$types';

	/**
	 * A movement's detail and edit in one: tapping a field changes it, and every change saves on its own
	 * (`?/update`) with a Deshacer toast. `drawer` lives over the list (shallow route); `page` is the
	 * full /movements/<id> page. A type change that needs a field the movement lacks (category, Hacia,
	 * Cotización) stays staged until that field is picked, then everything saves in one post.
	 */
	let {
		data,
		variant,
		onclose
	}: { data: PageData; variant: 'page' | 'drawer'; onclose?: () => void } = $props();

	type Movement = PageData['movement'];
	const drawer = $derived(variant === 'drawer');

	let m = $state<Movement>(untrack(() => data.movement));
	// Fixed payments the movement can link to; they depend on its type and account currency, so every save refreshes them.
	let rules = $state(untrack(() => data.rules));
	type Saved = { movement: Movement; rules: typeof data.rules };

	// What the update action stores, as the strings it takes (same as `formValues` on the server).
	const values = $derived<Record<string, string>>({
		type: m.type,
		occurredAt: m.occurredAt,
		description: m.description,
		amount: formatAmountInput(m.amount, m.accountCurrency),
		accountId: m.accountId,
		destinationAccountId: m.destinationAccountId ?? '',
		categoryId: m.categoryId ?? '',
		exchangeRate: m.exchangeRate !== null ? formatAmountInput(m.exchangeRate, 'ARS') : ''
	});

	// Changes that wait for a field they need (a type or account change missing its category, Hacia or
	// Cotización): they are saved together, in one post, once nothing is missing.
	let pending = $state<Record<string, string>>({});
	const typeStaged = $derived('type' in pending);
	const effType = $derived((pending.type ?? m.type) as Movement['type']);
	const isTransfer = $derived(effType === 'transfer');

	const archived = (name: string, is: boolean) => (is ? `${name} · Archivada` : name);
	const accounts = $derived(
		data.accounts.map((a) => ({ ...a, name: archived(a.name, a.archived), archived: false }))
	);
	const kindFits = (kind: string | null, type: string) => kind === null || kind === type;
	const categories = $derived(
		data.categories
			.filter((c) => kindFits(c.kind, effType) || (!typeStaged && c.id === m.categoryId))
			.map((c) => ({ ...c, name: archived(c.name, c.archived), archived: false }))
	);
	// The stored category only carries over to a new type whose kind accepts it.
	const keptCategory = (type: string) => {
		const c = data.categories.find((c) => c.id === m.categoryId);
		return m.categoryId && (type === m.type || (c && kindFits(c.kind, type))) ? m.categoryId : '';
	};
	const categoryId = $derived(pending.categoryId ?? keptCategory(effType));

	const typeItems: ComponentProps<typeof OptionPicker>['items'] = [
		{ id: 'outcome', name: 'Gasto', icon: 'cart', color: null },
		{ id: 'income', name: 'Ingreso', icon: 'plus', color: null },
		{ id: 'transfer', name: 'Transferencia', icon: 'transfer', color: null }
	];

	// Picker rows report their error here, keyed by field.
	let errors = $state<Record<string, string>>({});
	const originId = $derived(pending.accountId ?? m.accountId);
	const destinationId = $derived(pending.destinationAccountId ?? m.destinationAccountId ?? '');
	const currencyOf = (id: string) => data.accounts.find((a) => a.id === id)?.currency;
	const crossCurrency = $derived(
		isTransfer && !!destinationId && currencyOf(originId) !== currencyOf(destinationId)
	);

	const path = $derived(resolve(`/movements/${m.id}`));

	const ruleItems = $derived([
		{ id: '', name: 'Ninguno', icon: 'categories', color: null },
		...rules
	] as ComponentProps<typeof OptionPicker>['items']);
	async function linkRule(v: string) {
		if (v === (m.recurringId ?? '')) return;
		errors.recurringId =
			(await autosave<Saved>({
				path: `${path}?/link`,
				fields: { recurringId: v },
				previous: { recurringId: m.recurringId ?? '' },
				apply: (r) => {
					m = r.movement;
					rules = r.rules;
					errors = {};
				}
			})) ?? '';
	}

	function save(fields: Record<string, string>) {
		// A type or transfer account change can drop or add fields: undo restores the whole prior state.
		const touchesAccount = 'accountId' in fields || 'destinationAccountId' in fields;
		const keys = [
			...Object.keys(fields),
			...('type' in fields
				? ['type', 'accountId', 'destinationAccountId', 'categoryId', 'exchangeRate', 'amount']
				: isTransfer && touchesAccount
					? ['accountId', 'destinationAccountId', 'exchangeRate', 'amount']
					: [])
		];
		const previous = Object.fromEntries(keys.map((k) => [k, values[k]]));
		return autosave<Saved>({
			path: `${path}?/update`,
			fields,
			previous,
			apply: (r) => {
				m = r.movement;
				rules = r.rules;
				pending = {};
				errors = {};
			}
		});
	}

	// What the staged fields still lack before the server can take them (same rules as resolveMovement).
	function missing(f: Record<string, string>) {
		const type = f.type ?? m.type;
		if (type !== 'transfer') {
			const kept = 'type' in f ? keptCategory(type) : (m.categoryId ?? '');
			return (f.categoryId ?? kept) ? null : 'category';
		}
		const destination = f.destinationAccountId ?? m.destinationAccountId ?? '';
		if (!destination) return 'destination';
		const cross = currencyOf(f.accountId ?? m.accountId) !== currencyOf(destination);
		return cross && !f.exchangeRate && !m.exchangeRate ? 'rate' : null;
	}

	// The picker returns focus to its row as it closes: take it back (or open the one that is needed).
	function prompt(what: string) {
		setTimeout(() => {
			if (what === 'rate')
				document.querySelector<HTMLInputElement>('input[aria-label="Cotización"]')?.focus();
			else
				document
					.querySelector<HTMLButtonElement>(`[data-row="${what}"] button[aria-haspopup="dialog"]`)
					?.click();
		}, 400);
	}

	/** Saves the staged fields plus `extra` in one post, or keeps them staged while something is missing. */
	async function commit(extra: Record<string, string>) {
		const fields = { ...pending, ...extra };
		const what = missing(fields);
		if (!what) return save(fields);
		Object.assign(pending, extra);
		if (what === 'category') errors.categoryId = 'Elegí una categoría.';
		if (what === 'destination') errors.destinationAccountId = 'Elegí la cuenta de destino.';
		prompt(what);
		return null;
	}

	async function saveField(key: string, value: string) {
		if (value === (pending[key] ?? (typeStaged ? undefined : values[key]))) return;
		errors[key] = (await commit({ [key]: value })) ?? '';
	}

	async function saveAccount(key: 'accountId' | 'destinationAccountId', id: string) {
		if (id === (pending[key] ?? values[key])) return;
		if (id === values[key] && !typeStaged) {
			delete pending[key];
			return;
		}
		errors[key] = (await commit({ [key]: id })) ?? '';
	}

	async function selectType(next: string) {
		if (next === effType) return;
		pending = {};
		errors = {};
		if (next === m.type) return;
		await commit({ type: next });
	}

	// Same text as the server (src/lib/server/movements.ts).
	const RATE_MESSAGE = 'Ingresá la cotización (1 USD = X ARS) en pesos enteros y mayor a cero.';
	const needsRate = $derived(crossCurrency && !m.exchangeRate && !pending.exchangeRate);
	// Closing with a change still waiting for a field drops it: say so.
	$effect(() => () => {
		const p = untrack(() => pending);
		if ('type' in p) toast.error('No se guardó el cambio de tipo.');
		else if (Object.keys(p).length) toast.error('No se guardó el cambio de cuenta.');
	});

	const saveRate = (next: string) => commit({ exchangeRate: next });

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
		<fieldset class="lock" disabled={typeStaged}>
			<h2 class="description">
				<InlineText
					label="Descripción"
					value={values.description}
					maxlength={DESCRIPTION_MAX_LENGTH}
					onsave={(next) => commit({ description: next })}
				>
					{#snippet display()}{m.description}{/snippet}
				</InlineText>
			</h2>
			<div class="amount {effType}">
				<InlineText
					label="Monto"
					inputmode="decimal"
					prefix={m.accountCurrency === 'USD' ? 'US$' : '$'}
					value={values.amount}
					onsave={(next) => commit({ amount: next })}
				>
					{#snippet display()}
						<Money cents={m.amount} currency={m.accountCurrency} tone="flow" direction={effType} />
					{/snippet}
				</InlineText>
			</div>
		</fieldset>
	</div>

	<ul class="card">
		<li>
			<OptionPicker
				name="type"
				legend="Tipo"
				title="Tipo"
				items={typeItems}
				bind:value={() => effType, (v) => void selectType(v)}
				placeholder="Elegir"
				nested={drawer}
				{empty}
			/>
		</li>
		<li>
			<fieldset class="lock" disabled={typeStaged}>
				<MovementDatePicker
					name="occurredAt"
					label="Fecha"
					min={MIN_DAY}
					bind:value={() => values.occurredAt, (v) => void saveField('occurredAt', v)}
					plain
					nested={drawer}
					error={errors.occurredAt}
					errorId="date-error"
				/>
			</fieldset>
		</li>
		<li>
			<fieldset class="lock" disabled={typeStaged}>
				<OptionPicker
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
			</fieldset>
		</li>
		{#if isTransfer}
			<li data-row="destination">
				<OptionPicker
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
						{#if m.destinationAmount !== null && m.destinationCurrency && !pending.accountId && !pending.destinationAccountId && !typeStaged}
							<span class="v converted"
								>{formatMoney(m.destinationAmount, m.destinationCurrency)}</span
							>
						{:else}
							<span class="v muted">—</span>
						{/if}
					</p>
				</li>
				<li>
					<div class="row rate">
						<span class="k">Cotización</span>
						<span class="v">
							<InlineText
								label="Cotización"
								inputmode="numeric"
								prefix="1 USD = $"
								value={values.exchangeRate}
								open={needsRate}
								required={needsRate}
								onsave={saveRate}
							>
								{#snippet display()}
									<span class:muted={m.exchangeRate === null}
										>{m.exchangeRate !== null
											? `1 USD = ${formatMoney(m.exchangeRate, 'ARS')}`
											: 'Ingresar'}</span
									>
									<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" class="chev" />
								{/snippet}
							</InlineText>
						</span>
					</div>
					{#if needsRate}<p class="staged" role="alert">{RATE_MESSAGE}</p>{/if}
				</li>
			{/if}
		{:else}
			<li data-row="category">
				<OptionPicker
					name="categoryId"
					legend="Categoría"
					title="Categoría"
					items={categories}
					bind:value={() => categoryId, (v) => void saveField('categoryId', v)}
					nested={drawer}
					placeholder="Elegir"
					error={errors.categoryId}
					errorId="category-error"
					{empty}
				/>
			</li>
			{#if !typeStaged && (rules.length || m.recurringId)}
				<li data-row="rule">
					<OptionPicker
						name="recurringId"
						legend={effType === 'income' ? 'Ingreso fijo' : 'Pago fijo'}
						title={effType === 'income' ? 'Ingreso fijo' : 'Pago fijo'}
						items={ruleItems}
						bind:value={() => m.recurringId ?? '', (v) => void linkRule(v)}
						nested={drawer}
						placeholder="Ninguno"
						error={errors.recurringId}
						errorId="rule-error"
						{empty}
					/>
				</li>
			{/if}
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
					<AlertDialog.Footer>
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

	.converted {
		color: var(--transfer);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.muted {
		color: var(--text-muted);
		font-weight: 400;
	}

	/* Cotización reads like the picker rows: the value side is the tap target, chevron at the end. */
	/* Same label weight as the picker rows (ghost buttons). */
	.row .k {
		font-weight: 500;
	}

	.rate .v {
		flex: 1;
	}

	.rate :global(.edit) {
		white-space: nowrap;
	}

	.rate :global(.trigger) {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		width: 100%;
		cursor: pointer;
	}

	.rate :global(.chev) {
		flex: none;
		color: var(--text-muted);
	}

	/* The currency symbol stays while the amount is edited, smaller and muted like the read state. */
	.amount :global(.prefix) {
		font-size: 0.55em;
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
	.lock {
		display: contents;
	}
</style>
