<script lang="ts">
	import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
	import { onMount, tick, untrack, type ComponentProps } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';

	type Picker = ComponentProps<typeof OptionPicker>['items'][number];
	type Fields = 'type' | 'description' | 'amount' | 'accountId' | 'categoryId' | 'dayOfMonth';

	let {
		initial,
		errors = {},
		accounts,
		categories,
		action = '',
		submitLabel,
		inline = false
	}: {
		initial: Record<Fields, string>;
		errors?: Partial<Record<Fields, string>>;
		accounts: Picker[];
		categories: (Picker & { kind: string | null })[];
		action?: string;
		submitLabel: string;
		/** Embedded in a screen with the tab bar and its own hero: amount as a row, save bar not pinned. */
		inline?: boolean;
	} = $props();

	let type = $state(untrack(() => initial.type || 'outcome'));
	let accountId = $state(untrack(() => initial.accountId));
	let amount = $state(untrack(() => initial.amount));
	let categoryId = $state(untrack(() => initial.categoryId));
	let mounted = $state(false);
	onMount(() => (mounted = true));

	// Without JS the type changes without a reload, so every category is listed (the server validates).
	// The rule's own saved category stays pickable.
	const pickableCategories = $derived(
		mounted
			? categories.filter(
					(c) => c.kind === null || c.kind === type || c.id === untrack(() => initial.categoryId)
				)
			: categories
	);
	$effect(() => {
		if (categoryId && !pickableCategories.some((c) => c.id === categoryId)) categoryId = '';
	});

	const typeOptions = [
		{ value: 'outcome', label: 'Pago' },
		{ value: 'income', label: 'Ingreso' }
	];
	const currency = $derived(accounts.find((a) => a.id === accountId)?.meta);
	const symbol = $derived(currency === 'USD' ? 'US$' : '$');

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
</script>

{#snippet amountInput()}
	<input
		class="amount-input"
		name="amount"
		type="text"
		inputmode={currency === 'USD' ? 'decimal' : 'numeric'}
		placeholder={currency === 'USD' ? '0,00' : '0'}
		autocomplete="off"
		bind:value={amount}
		aria-invalid={errors.amount ? 'true' : undefined}
		aria-describedby={errors.amount ? 'ramount-error' : undefined}
	/>
{/snippet}

<form method="POST" {action} use:enhance class="form" novalidate>
	<div class="field">
		<span id="rtype-label" class="visually-hidden">Tipo</span>
		<SegmentedControl
			name="type"
			options={typeOptions}
			bind:value={type}
			labelledby="rtype-label"
		/>
		{#if errors.type}<p class="error" role="alert">{errors.type}</p>{/if}
	</div>

	{#if !inline}
		<div class="amount-block">
			<label class="amount" class:sm={amount.length > 11}>
				<span class="visually-hidden">Monto</span>
				{#if currency}<span class="currency">{symbol}</span>{/if}
				{@render amountInput()}
			</label>
			{#if errors.amount}<p class="error" id="ramount-error" role="alert">{errors.amount}</p>{/if}
		</div>
	{/if}

	<ul class="card">
		{#if inline}
			<li class:bad={errors.amount}>
				<label class="row">
					<span class="k">Monto</span>
					{#if currency}<span class="cur">{symbol}</span>{/if}
					{@render amountInput()}
				</label>
				{#if errors.amount}
					<p class="error et" id="ramount-error" role="alert">{errors.amount}</p>
				{/if}
			</li>
		{/if}

		<li class:bad={errors.description}>
			<label class="row">
				<span class="k">Descripción</span>
				<input
					name="description"
					type="text"
					maxlength={DESCRIPTION_MAX_LENGTH}
					required
					autocomplete="off"
					placeholder={type === 'income' ? 'Sueldo' : 'Alquiler'}
					value={initial.description}
					aria-invalid={errors.description ? 'true' : undefined}
					aria-describedby={errors.description ? 'rdesc-error' : undefined}
				/>
			</label>
			{#if errors.description}
				<p class="error et" id="rdesc-error" role="alert">{errors.description}</p>
			{/if}
		</li>

		<li class:bad={errors.dayOfMonth}>
			<label class="row">
				<span class="k">Día del mes</span>
				<input
					name="dayOfMonth"
					type="number"
					inputmode="numeric"
					min="1"
					max="31"
					value={initial.dayOfMonth}
					aria-invalid={errors.dayOfMonth ? 'true' : undefined}
					aria-describedby="rday-hint{errors.dayOfMonth ? ' rday-error' : ''}"
				/>
			</label>
			{#if errors.dayOfMonth}
				<p class="error et" id="rday-error" role="alert">{errors.dayOfMonth}</p>
			{/if}
		</li>

		<li class:bad={errors.accountId}>
			<OptionPicker
				variant="row"
				name="accountId"
				legend="Cuenta"
				title="Elegí la cuenta"
				items={accounts}
				bind:value={accountId}
				placeholder="Elegir cuenta"
				error={errors.accountId}
				errorId="raccount-error"
			>
				{#snippet empty()}
					<p class="hint pad">
						Todavía no tenés cuentas. <a href={resolve('/accounts/new')}>Crear cuenta</a>
					</p>
				{/snippet}
			</OptionPicker>
		</li>

		<li class:bad={errors.categoryId}>
			<OptionPicker
				variant="row"
				name="categoryId"
				legend="Categoría"
				title="Elegí la categoría"
				items={pickableCategories}
				bind:value={categoryId}
				placeholder="Elegir categoría"
				error={errors.categoryId}
				errorId="rcategory-error"
			>
				{#snippet empty()}
					<p class="hint pad">
						Todavía no tenés categorías. <a href={resolve('/categories/new')}>Crear categoría</a>
					</p>
				{/snippet}
			</OptionPicker>
		</li>
	</ul>
	<p id="rday-hint" class="hint after">Si el mes es más corto, vence el último día.</p>

	<div class="bar" class:is-sticky={!inline}>
		<Button type="submit" class="w-full">{submitLabel}</Button>
	</div>
	<div class="cancel">
		<Button href={resolve('/plan')} variant="outline">Cancelar</Button>
	</div>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
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

	.cur {
		margin-inline-start: auto;
		color: var(--text-muted);
	}

	.cur + :global(input) {
		flex: 0 1 8rem;
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

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.hint.after {
		margin-top: calc(var(--space-4) * -1);
		padding-inline: var(--space-4);
	}

	.hint.pad {
		padding: var(--space-3) var(--space-4);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.et {
		padding: 0 var(--space-4) var(--space-3);
	}

	/* Sticky save bar: full-bleed, pinned to the bottom of the viewport (no tab bar on this screen). */
	.bar.is-sticky {
		position: sticky;
		bottom: 0;
		z-index: 2;
		margin-inline: calc(var(--gutter, var(--space-5)) * -1);
		padding: var(--space-3) var(--gutter, var(--space-5))
			calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--bg);
		box-shadow: 0 -1px 0 var(--border);
	}

	.cancel {
		display: flex;
		justify-content: center;
	}
</style>
