<script lang="ts">
	import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
	import type { Currency } from '$lib/money';
	import { onMount, tick, untrack, type ComponentProps } from 'svelte';
	import Lock from '@lucide/svelte/icons/lock';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import Checkbox from '$lib/components/Checkbox.svelte';
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
		accounts: (Picker & { currency: Currency })[];
		categories: (Picker & { kind: string | null })[];
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

	let submitting = $state(false);
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

	// After a failed submit, move focus to the first field marked invalid (inputs or picker triggers).
	$effect(() => {
		if (!Object.values(errors).some(Boolean)) return;
		tick().then(() => {
			document
				.querySelector<HTMLElement>(
					'form [aria-invalid="true"], form button[aria-describedby$="-error"]'
				)
				?.focus();
		});
	});

	$effect(() => {
		if (destinationId && destinationId === accountId) destinationId = '';
	});

	// Without JS the type changes without a reload, so every category is listed (the server validates).
	// A category already saved on this movement or rule stays pickable.
	const pickableCategories = $derived(
		!mounted || isTransfer
			? categories
			: categories.filter(
					(c) => c.kind === null || c.kind === type || c.id === untrack(() => initial.categoryId)
				)
	);
	$effect(() => {
		if (categoryId && !pickableCategories.some((c) => c.id === categoryId)) categoryId = '';
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

<form
	method="POST"
	class="form"
	class:submitting
	novalidate
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update();
			submitting = false;
		};
	}}
>
	{#if recurring}
		<input type="hidden" name="recurringId" value={recurring.id} />
		<p class="hint note">
			Registrás el pago de <strong>{recurring.description}</strong> de este mes.
		</p>
	{/if}

	<div class="field">
		<span id="type-label" class="visually-hidden">Tipo</span>
		<SegmentedControl name="type" options={typeOptions} bind:value={type} labelledby="type-label" />
		{#if errors.type}<p class="error" role="alert">{errors.type}</p>{/if}
	</div>

	<div class="amount-block">
		<label class="amount" class:sm={amount.length > 11}>
			<span class="visually-hidden">Monto</span>
			{#if originCurrency}<span class="currency">{originCurrency === 'USD' ? 'US$' : '$'}</span
				>{/if}
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
		</label>
		{#if errors.amount}<p class="error" id="amount-error" role="alert">{errors.amount}</p>{/if}
	</div>

	<ul class="card">
		<li class:bad={errors.description}>
			<label class="row">
				<span class="k">Descripción</span>
				<input
					name="description"
					type="text"
					maxlength={DESCRIPTION_MAX_LENGTH}
					required
					autocomplete="off"
					placeholder="Agregar"
					bind:value={description}
					aria-invalid={errors.description ? 'true' : undefined}
					aria-describedby={errors.description ? 'description-error' : undefined}
				/>
			</label>
			{#if errors.description}
				<p class="error et" id="description-error" role="alert">{errors.description}</p>
			{/if}
		</li>

		<li class:bad={errors.accountId}>
			<OptionPicker
				variant="row"
				name="accountId"
				legend={isTransfer ? 'Cuenta de origen' : 'Cuenta'}
				title="Elegí la cuenta"
				items={accounts}
				bind:value={accountId}
				placeholder="Elegir cuenta"
				error={errors.accountId}
				errorId="account-error"
			>
				{#snippet empty()}<p class="hint pad">Todavía no tenés cuentas.</p>{/snippet}
			</OptionPicker>
		</li>

		{#if showTransfer}
			<li class:bad={errors.destinationAccountId}>
				{#if !mounted}<p class="hint pad">Solo para transferencias</p>{/if}
				<OptionPicker
					variant="row"
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
					{#snippet empty()}<p class="hint pad">Necesitás otra cuenta para transferir.</p>{/snippet}
				</OptionPicker>
			</li>
		{/if}

		{#if !mounted || showRate}
			<li class:bad={errors.exchangeRate}>
				{#if !mounted}<p class="hint pad">Solo para transferencias entre monedas distintas</p>{/if}
				<label class="row">
					<span class="k">Cotización (1 USD en ARS)</span>
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
				</label>
				{#if errors.exchangeRate}
					<p class="error et" id="rate-error" role="alert">{errors.exchangeRate}</p>
				{/if}
			</li>
			{#if mounted}
				<li>
					<p class="hint pad" aria-live="polite">
						{#if converted !== null && destCurrency}
							Monto en destino: {formatMoney(converted, destCurrency)}
						{:else}
							Ingresá monto y cotización para ver el monto en destino.
						{/if}
					</p>
				</li>
			{/if}
		{/if}

		{#if showCategory}
			<li class:bad={errors.categoryId && !recurring}>
				{#if !mounted}<p class="hint pad">Solo para ingresos y gastos</p>{/if}
				{#if recurring}
					<!-- The payment always takes the rule's category (the server ignores any other). -->
					<input type="hidden" name="categoryId" value={categoryId} />
					<p class="row locked">
						<span class="k">Categoría</span>
						<span class="v">
							{categories.find((c) => c.id === categoryId)?.name ?? ''}
							<Lock size={16} strokeWidth={1.75} aria-hidden="true" />
						</span>
					</p>
					<p class="hint pad">Se registra en la categoría del pago.</p>
				{:else}
					<OptionPicker
						variant="row"
						name="categoryId"
						legend="Categoría"
						title="Elegí la categoría"
						items={pickableCategories}
						bind:value={categoryId}
						placeholder="Elegir categoría"
						error={errors.categoryId}
						errorId="category-error"
					>
						{#snippet empty()}
							<p class="hint pad">
								Todavía no tenés categorías.
								<a href={resolve('/categories/new')}>Crear categoría</a>
							</p>
						{/snippet}
					</OptionPicker>
				{/if}
			</li>
		{/if}

		<li class:bad={errors.occurredAt}>
			<label class="row">
				<span class="k">Fecha</span>
				<input
					name="occurredAt"
					type="date"
					min="2000-01-01"
					bind:value={occurredAt}
					aria-invalid={errors.occurredAt ? 'true' : undefined}
					aria-describedby={errors.occurredAt ? 'date-error' : undefined}
				/>
			</label>
			{#if errors.occurredAt}
				<p class="error et" id="date-error" role="alert">{errors.occurredAt}</p>
			{/if}
		</li>
	</ul>

	{#if repeatable && !recurring && showCategory}
		<div class="group">
			<ul class="card">
				<li class="check">
					<Checkbox
						name="repeat"
						label="Repetir cada mes"
						checked={repeatChecked}
						aria-describedby="repeat-hint"
					/>
				</li>
			</ul>
			<p id="repeat-hint" class="hint pad">
				Te lo recordamos el mismo día de cada mes. Solo ingresos y gastos.
			</p>
		</div>
	{/if}

	<div class="bar">
		<Button type="submit" block disabled={submitting} aria-busy={submitting ? 'true' : undefined}>
			{#if submitting}<span class="spin" aria-hidden="true"></span>{/if}{submitLabel}
		</Button>
	</div>
	<div class="cancel">
		<Button href={resolve(cancelHref as '/')} variant="secondary">Cancelar</Button>
	</div>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}

	.form.submitting > :not(.bar) {
		opacity: 0.55;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.note {
		margin-bottom: calc(var(--space-3) * -1);
		text-align: center;
	}

	.amount-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}

	.amount {
		flex-direction: row;
		align-items: baseline;
		justify-content: center;
		gap: var(--space-2);
		max-width: 100%;
		padding: var(--space-4) 0 var(--space-1);
		color: var(--text);
	}

	.currency {
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 500;
		color: var(--text-muted);
	}

	.amount .amount-input {
		flex: 0 1 auto;
		width: auto;
		min-width: 2ch;
		max-width: 100%;
		field-sizing: content;
		min-height: 3.5rem;
		padding: 0 var(--space-1);
		border: 0;
		background: transparent;
		font-family: var(--font-display);
		font-size: 2.75rem;
		font-weight: 500;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.amount.sm .amount-input {
		font-size: var(--font-size-hero);
	}

	.amount .amount-input::placeholder,
	.row input::placeholder {
		color: var(--text-muted);
		opacity: 1;
	}

	.amount-block .error {
		text-align: center;
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

	.card > li + li {
		border-top: 1px solid var(--border);
	}

	.card > li.bad {
		box-shadow: inset 3px 0 0 var(--negative);
	}

	.row {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-base);
		color: var(--text);
	}

	label.row {
		cursor: text;
	}

	.row input {
		flex: 1 1 4rem;
		min-width: 0;
		width: auto;
		min-height: 3.5rem;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		text-align: right;
		scroll-margin-bottom: 6rem;
	}

	.row input:focus-visible {
		outline-offset: -2px;
	}

	.locked {
		justify-content: space-between;
		color: var(--text-muted);
	}

	.locked .v {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text);
	}

	.check {
		padding: 0 var(--space-4);
	}

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.hint.pad {
		padding: var(--space-3) var(--space-4);
	}

	.group > .hint.pad {
		padding-bottom: 0;
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.et {
		padding: 0 var(--space-4) var(--space-3);
	}

	/* Sticky Guardar: full-bleed bar pinned to the bottom of the viewport (no tab bar on this screen). */
	.bar {
		position: sticky;
		bottom: 0;
		z-index: 2;
		margin-inline: calc(var(--gutter, var(--space-5)) * -1);
		padding: var(--space-3) var(--gutter, var(--space-5))
			calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--bg);
		box-shadow: 0 -1px 0 var(--border);
	}

	.spin {
		width: 1rem;
		height: 1rem;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spin {
			animation-duration: 2.4s;
		}
	}

	.cancel {
		display: flex;
		justify-content: center;
	}
</style>
