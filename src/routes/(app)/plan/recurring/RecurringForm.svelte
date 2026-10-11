<script lang="ts">
	import { groupedAmount } from '$lib/amount-input';
	import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
	import { onMount, tick, untrack, type ComponentProps } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
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

{#snippet amountField(cls: string)}
	<Field.Field class={cls}>
		<Field.Label for="ramount">Monto</Field.Label>
		<InputGroup.Root>
			{#if currency}
				<InputGroup.Addon><InputGroup.Text>{symbol}</InputGroup.Text></InputGroup.Addon>
			{/if}
			<InputGroup.Input
				id="ramount"
				name="amount"
				type="text"
				inputmode={currency === 'USD' ? 'decimal' : 'numeric'}
				placeholder={currency === 'USD' ? '0,00' : '0'}
				autocomplete="off"
				bind:value={amount}
				{@attach groupedAmount}
				aria-invalid={errors.amount ? 'true' : undefined}
				aria-describedby={errors.amount ? 'ramount-error' : undefined}
			/>
		</InputGroup.Root>
		{#if errors.amount}<Field.Error id="ramount-error">{errors.amount}</Field.Error>{/if}
	</Field.Field>
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
		{@render amountField('')}
	{/if}

	<ul class="card">
		{#if inline}
			<li class:bad={errors.amount}>
				{@render amountField('p-4')}
			</li>
		{/if}

		<li class:bad={errors.description}>
			<Field.Field class="p-4">
				<Field.Label for="rdescription">Descripción</Field.Label>
				<Input
					id="rdescription"
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
				{#if errors.description}
					<Field.Error id="rdesc-error">{errors.description}</Field.Error>
				{/if}
			</Field.Field>
		</li>

		<li class:bad={errors.dayOfMonth}>
			<Field.Field class="p-4">
				<Field.Label for="rday">Día del mes</Field.Label>
				<Input
					id="rday"
					name="dayOfMonth"
					type="number"
					inputmode="numeric"
					min="1"
					max="31"
					value={initial.dayOfMonth}
					aria-invalid={errors.dayOfMonth ? 'true' : undefined}
					aria-describedby="rday-hint{errors.dayOfMonth ? ' rday-error' : ''}"
				/>
				{#if errors.dayOfMonth}
					<Field.Error id="rday-error">{errors.dayOfMonth}</Field.Error>
				{/if}
			</Field.Field>
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
