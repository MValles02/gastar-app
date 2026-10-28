<script lang="ts">
	import type { Currency } from '$lib/money';
	import { onMount, tick, untrack, type ComponentProps } from 'svelte';
	import Lock from '@lucide/svelte/icons/lock';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import AmountHero from '$lib/components/AmountHero.svelte';
	import EntryFields from '$lib/components/EntryFields.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import SwitchRow from '$lib/components/SwitchRow.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
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
		{ value: 'transfer', label: 'Transf.' }
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

	<AmountHero bind:value={amount} currency={originCurrency} error={errors.amount} autofocus />

	<EntryFields bind:description descriptionId="description" descriptionError={errors.description}>
		{#snippet account()}
			<li class:bad={errors.accountId}>
				<OptionPicker
					variant="row"
					name="accountId"
					legend={isTransfer ? 'Origen' : 'Cuenta'}
					title="Elegí la cuenta"
					items={accounts}
					bind:value={accountId}
					placeholder="Elegir"
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
						legend="Destino"
						title="Elegí la cuenta de destino"
						items={accounts}
						bind:value={destinationId}
						excludeId={mounted ? accountId : undefined}
						placeholder="Elegir"
						error={errors.destinationAccountId}
						errorId="destination-error"
					>
						{#snippet empty()}<p class="hint pad">
								Necesitás otra cuenta para transferir.
							</p>{/snippet}
					</OptionPicker>
				</li>
			{/if}

			{#if !mounted || showRate}
				<li class:bad={errors.exchangeRate}>
					{#if !mounted}<p class="hint pad">
							Solo para transferencias entre monedas distintas
						</p>{/if}
					<TextRow
						id="exchangeRate"
						name="exchangeRate"
						label="Cotización (1 USD en ARS)"
						bind:value={rate}
						placeholder="0"
						inputmode="numeric"
						amount
						error={errors.exchangeRate}
						errorId="rate-error"
					/>
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
		{/snippet}

		{#snippet category()}
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
							placeholder="Elegir"
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
		{/snippet}

		{#snippet when()}
			<li class:bad={errors.occurredAt}>
				<DatePicker
					name="occurredAt"
					label="Fecha"
					min="2000-01-01"
					bind:value={occurredAt}
					error={errors.occurredAt}
					errorId="date-error"
				/>
			</li>
		{/snippet}

		{#snippet extra()}
			{#if repeatable && !recurring && showCategory}
				<li>
					<SwitchRow
						id="repeat"
						name="repeat"
						label="Repetir cada mes"
						checked={repeatChecked}
						describedby="repeat-hint"
					/>
				</li>
			{/if}
		{/snippet}
	</EntryFields>

	{#if repeatable && !recurring && showCategory}
		<p id="repeat-hint" class="hint pad">Te lo recordamos el mismo día de cada mes.</p>
	{/if}

	<FormActions {cancelHref} {submitLabel} {submitting} />
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}

	.form.submitting > :not(:global(.bar)) {
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

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.hint.pad {
		padding: var(--space-3) var(--space-4);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
