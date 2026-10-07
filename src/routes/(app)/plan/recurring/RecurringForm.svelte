<script lang="ts">
	import { untrack, type ComponentProps } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import Field from '$lib/components/Field.svelte';
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
		submitLabel
	}: {
		initial: Record<Fields, string>;
		errors?: Partial<Record<Fields, string>>;
		accounts: Picker[];
		categories: Picker[];
		action?: string;
		submitLabel: string;
	} = $props();

	let type = $state(untrack(() => initial.type || 'outcome'));
	let accountId = $state(untrack(() => initial.accountId));
	let categoryId = $state(untrack(() => initial.categoryId));
	const typeOptions = [
		{ value: 'outcome', label: 'Pago' },
		{ value: 'income', label: 'Ingreso' }
	];
</script>

<form method="POST" {action} use:enhance class="form" novalidate>
	<div class="field">
		<span id="rtype-label" class="label">Tipo</span>
		<SegmentedControl
			name="type"
			options={typeOptions}
			bind:value={type}
			labelledby="rtype-label"
		/>
		{#if errors.type}<p class="error" role="alert">{errors.type}</p>{/if}
	</div>

	<Field label="Descripción" error={errors.description} errorId="rdesc-error">
		<input
			name="description"
			type="text"
			maxlength="60"
			required
			autocomplete="off"
			placeholder={type === 'income' ? 'Sueldo' : 'Alquiler'}
			value={initial.description}
			aria-invalid={errors.description ? 'true' : undefined}
			aria-describedby={errors.description ? 'rdesc-error' : undefined}
		/>
	</Field>

	<Field label="Monto" error={errors.amount} errorId="ramount-error">
		<input
			name="amount"
			type="text"
			inputmode={accounts.find((a) => a.id === accountId)?.meta === 'USD' ? 'decimal' : 'numeric'}
			placeholder={accounts.find((a) => a.id === accountId)?.meta === 'USD' ? '0,00' : '0'}
			autocomplete="off"
			value={initial.amount}
			aria-invalid={errors.amount ? 'true' : undefined}
			aria-describedby={errors.amount ? 'ramount-error' : undefined}
		/>
	</Field>

	<Field label="Día del mes" error={errors.dayOfMonth} errorId="rday-error">
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
	</Field>
	<p id="rday-hint" class="hint">Si el mes es más corto, vence el último día.</p>

	<OptionPicker
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
			<p class="hint">
				Todavía no tenés cuentas. <a href={resolve('/accounts/new')}>Crear cuenta</a>
			</p>
		{/snippet}
	</OptionPicker>

	<OptionPicker
		name="categoryId"
		legend="Categoría"
		title="Elegí la categoría"
		items={categories}
		bind:value={categoryId}
		placeholder="Elegir categoría"
		error={errors.categoryId}
		errorId="rcategory-error"
	>
		{#snippet empty()}
			<p class="hint">
				Todavía no tenés categorías. <a href={resolve('/categories/new')}>Crear categoría</a>
			</p>
		{/snippet}
	</OptionPicker>

	<div class="actions">
		<Button type="submit">{submitLabel}</Button>
		<Button href={resolve('/plan')} variant="secondary">Cancelar</Button>
	</div>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.label {
		font-size: var(--font-size-sm);
	}

	.hint {
		margin-top: calc(var(--space-4) * -1);
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
