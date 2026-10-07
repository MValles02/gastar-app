<script lang="ts">
	import { onMount, untrack, type ComponentProps } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import Field from '$lib/components/Field.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import { convertAmount, formatMoney, parseAmount } from '$lib/money';

	type Picker = ComponentProps<typeof OptionPicker>['items'][number];
	type Fields =
		| 'type'
		| 'amount'
		| 'description'
		| 'accountId'
		| 'destinationAccountId'
		| 'exchangeRate'
		| 'categoryId'
		| 'occurredAt';

	let {
		initial,
		errors = {},
		accounts,
		categories,
		submitLabel,
		cancelHref,
		recurring,
		repeatable = false,
		repeatChecked = false
	}: {
		initial: Record<Fields, string>;
		errors?: Partial<Record<Fields, string>>;
		accounts: (Picker & { currency: 'ARS' | 'USD' })[];
		categories: Picker[];
		submitLabel: string;
		cancelHref: string;
		/** Registering a payment of this recurring rule. */
		recurring?: { id: string; description: string };
		/** Offer "Repetir cada mes" (new incomes and outcomes only). */
		repeatable?: boolean;
		/** Initial state of the "Repetir cada mes" checkbox (kept when the form is shown again with errors). */
		repeatChecked?: boolean;
	} = $props();

	const typeOptions = [
		{ value: 'income', label: 'Ingreso' },
		{ value: 'outcome', label: 'Gasto' },
		{ value: 'transfer', label: 'Transferencia' }
	];

	let mounted = $state(false);
	onMount(() => (mounted = true));

	let type = $state(untrack(() => initial.type || 'outcome'));
	let accountId = $state(untrack(() => initial.accountId));
	let destinationId = $state(untrack(() => initial.destinationAccountId));
	let categoryId = $state(untrack(() => initial.categoryId));
	let occurredAt = $state(untrack(() => initial.occurredAt));
	let amount = $state(untrack(() => initial.amount));
	let description = $state(untrack(() => initial.description));
	let rate = $state(untrack(() => initial.exchangeRate));

	const isTransfer = $derived(type === 'transfer');
	const showTransfer = $derived(!mounted || isTransfer);
	const showCategory = $derived(!mounted || !isTransfer);

	$effect(() => {
		if (destinationId && destinationId === accountId) destinationId = '';
	});

	const originCurrency = $derived(accounts.find((a) => a.id === accountId)?.currency);
	const destCurrency = $derived(accounts.find((a) => a.id === destinationId)?.currency);
	const crossCurrency = $derived(
		!!originCurrency && !!destCurrency && originCurrency !== destCurrency
	);
	const showRate = $derived(isTransfer && crossCurrency);

	const converted = $derived.by(() => {
		const a = parseAmount(amount);
		const r = parseAmount(rate);
		if (!showRate || !originCurrency || !destCurrency) return null;
		if (a === null || a <= 0 || r === null || r <= 0) return null;
		return convertAmount(a, r, originCurrency, destCurrency);
	});
</script>

<form method="POST" use:enhance class="form" novalidate>
	{#if recurring}
		<input type="hidden" name="recurringId" value={recurring.id} />
		<p class="hint">Registrás el pago de <strong>{recurring.description}</strong> de este mes.</p>
	{/if}

	<div class="field">
		<span id="type-label" class="label">Tipo</span>
		<SegmentedControl name="type" options={typeOptions} bind:value={type} labelledby="type-label" />
		{#if errors.type}<p class="error" role="alert">{errors.type}</p>{/if}
	</div>

	<Field label="Monto" error={errors.amount} errorId="amount-error">
		<span class="amount-wrap">
			{#if originCurrency}<span class="currency">{originCurrency}</span>{/if}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="amount-input"
				name="amount"
				type="text"
				inputmode={originCurrency === 'USD' ? 'decimal' : 'numeric'}
				placeholder={originCurrency === 'USD' ? '0,00' : '0'}
				autocomplete="off"
				autofocus
				bind:value={amount}
				aria-invalid={errors.amount ? 'true' : undefined}
				aria-describedby={errors.amount ? 'amount-error' : undefined}
			/>
		</span>
	</Field>

	<Field label="Descripción" error={errors.description} errorId="description-error">
		<input
			name="description"
			type="text"
			maxlength="60"
			required
			autocomplete="off"
			bind:value={description}
			aria-invalid={errors.description ? 'true' : undefined}
			aria-describedby={errors.description ? 'description-error' : undefined}
		/>
	</Field>

	<OptionPicker
		name="accountId"
		legend={isTransfer ? 'Cuenta de origen' : 'Cuenta'}
		title="Elegí la cuenta"
		items={accounts}
		bind:value={accountId}
		placeholder="Elegir cuenta"
		error={errors.accountId}
		errorId="account-error"
	>
		{#snippet empty()}<p class="hint">Todavía no tenés cuentas.</p>{/snippet}
	</OptionPicker>

	{#if showTransfer}
		<div class="group">
			{#if !mounted}<p class="hint">Solo para transferencias</p>{/if}
			<OptionPicker
				name="destinationAccountId"
				legend="Cuenta de destino"
				title="Elegí la cuenta de destino"
				items={accounts}
				bind:value={destinationId}
				excludeId={mounted ? accountId : undefined}
				placeholder="Elegir cuenta"
				error={errors.destinationAccountId}
				errorId="destination-error"
			>
				{#snippet empty()}<p class="hint">Necesitás otra cuenta para transferir.</p>{/snippet}
			</OptionPicker>
		</div>
	{/if}

	{#if !mounted || showRate}
		<div class="group">
			{#if !mounted}<p class="hint">Solo para transferencias entre monedas distintas</p>{/if}
			<Field label="Cotización (1 USD en ARS)" error={errors.exchangeRate} errorId="rate-error">
				<input
					name="exchangeRate"
					type="text"
					inputmode="numeric"
					placeholder="0"
					autocomplete="off"
					bind:value={rate}
					aria-invalid={errors.exchangeRate ? 'true' : undefined}
					aria-describedby={errors.exchangeRate ? 'rate-error' : undefined}
				/>
			</Field>
		</div>
		{#if mounted}
			<p class="hint" aria-live="polite">
				{#if converted !== null && destCurrency}
					Monto en destino: {formatMoney(converted, destCurrency)}
				{:else}
					Ingresá monto y cotización para ver el monto en destino.
				{/if}
			</p>
		{/if}
	{/if}

	{#if showCategory}
		<div class="group">
			{#if !mounted}<p class="hint">Solo para ingresos y gastos</p>{/if}
			{#if recurring}
				<!-- The payment always takes the rule's category (the server ignores any other). -->
				<input type="hidden" name="categoryId" value={categoryId} />
				<span class="label">Categoría</span>
				<p class="fixed">
					{categories.find((c) => c.id === categoryId)?.name ?? ''}
				</p>
				<p class="hint">Se registra en la categoría del pago.</p>
			{:else}
				<OptionPicker
					name="categoryId"
					legend="Categoría"
					title="Elegí la categoría"
					items={categories}
					bind:value={categoryId}
					placeholder="Elegir categoría"
					error={errors.categoryId}
					errorId="category-error"
				>
					{#snippet empty()}
						<p class="hint">
							Todavía no tenés categorías.
							<a href={resolve('/categories/new')}>Crear categoría</a>
						</p>
					{/snippet}
				</OptionPicker>
			{/if}
		</div>
	{/if}

	<Field label="Fecha" error={errors.occurredAt} errorId="date-error">
		<input
			name="occurredAt"
			type="date"
			min="2000-01-01"
			bind:value={occurredAt}
			aria-invalid={errors.occurredAt ? 'true' : undefined}
			aria-describedby={errors.occurredAt ? 'date-error' : undefined}
		/>
	</Field>

	{#if repeatable && !recurring && showCategory}
		<div class="group">
			<Checkbox
				name="repeat"
				label="Repetir cada mes"
				checked={repeatChecked}
				aria-describedby="repeat-hint"
			/>
			<p id="repeat-hint" class="hint">
				Te lo recordamos el mismo día de cada mes. Solo ingresos y gastos.
			</p>
		</div>
	{/if}

	<div class="actions">
		<Button type="submit">{submitLabel}</Button>
		<Button href={resolve(cancelHref as '/')} variant="secondary">Cancelar</Button>
	</div>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.field,
	.group {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.label {
		font-size: var(--font-size-sm);
	}

	.fixed {
		display: flex;
		align-items: center;
		min-height: 2.75rem;
		font-weight: 600;
	}

	.amount-wrap {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.currency {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--text-muted);
	}

	.amount-wrap .amount-input {
		flex: 1;
		min-width: 0;
		min-height: 4rem;
		font-size: var(--font-size-xl);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
</style>
