<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import Field from '$lib/components/Field.svelte';
	import IconPicker from '$lib/components/IconPicker.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import type { AccountIconKey, SwatchKey } from '$lib/appearance';

	type Values = Partial<
		Record<'name' | 'currency' | 'initialBalance' | 'icon' | 'color', string | null>
	>;

	let {
		initial,
		errors = {},
		mode,
		currencyLocked = false,
		cancelHref
	}: {
		initial: Values;
		errors?: Partial<Record<keyof Values, string>>;
		mode: 'create' | 'edit';
		currencyLocked?: boolean;
		cancelHref: string;
	} = $props();

	let name = $state(untrack(() => initial.name ?? ''));
	let initialBalance = $state(untrack(() => initial.initialBalance ?? ''));
	let currency = $state(untrack(() => initial.currency || 'ARS'));
	let icon = $state(untrack(() => (initial.icon ?? 'wallet') as AccountIconKey));
	let color = $state(untrack(() => (initial.color ?? 'green') as SwatchKey));

	const currencyOptions = [
		{ value: 'ARS', label: 'ARS' },
		{ value: 'USD', label: 'USD' }
	];
</script>

<form method="POST" use:enhance class="form" novalidate>
	<Field label="Nombre" error={errors.name} errorId="name-error">
		<input
			name="name"
			type="text"
			maxlength="40"
			required
			autocomplete="off"
			bind:value={name}
			aria-invalid={errors.name ? 'true' : undefined}
			aria-describedby={errors.name ? 'name-error' : undefined}
		/>
	</Field>

	<div class="field">
		<span id="currency-label" class="label">Moneda</span>
		<SegmentedControl
			name="currency"
			options={currencyOptions}
			bind:value={currency}
			labelledby="currency-label"
			disabled={currencyLocked}
		/>
		{#if currencyLocked}
			<p class="hint">No se puede cambiar porque la cuenta tiene movimientos.</p>
		{/if}
		{#if errors.currency}
			<p class="error" role="alert">{errors.currency}</p>
		{/if}
	</div>

	<Field label="Saldo inicial" error={errors.initialBalance} errorId="balance-error">
		<input
			name="initialBalance"
			type="text"
			inputmode="decimal"
			placeholder={currency === 'USD' ? '0,00' : '0'}
			autocomplete="off"
			bind:value={initialBalance}
			aria-invalid={errors.initialBalance ? 'true' : undefined}
			aria-describedby={errors.initialBalance ? 'balance-error' : undefined}
		/>
	</Field>

	<div>
		<IconPicker name="icon" legend="Ícono" bind:value={icon} {color} />
		{#if errors.icon}<p class="error" role="alert">{errors.icon}</p>{/if}
	</div>

	<div>
		<ColorPicker name="color" legend="Color" bind:value={color} />
		{#if errors.color}<p class="error" role="alert">{errors.color}</p>{/if}
	</div>

	<div class="actions">
		<Button type="submit">{mode === 'create' ? 'Crear cuenta' : 'Guardar cambios'}</Button>
		<Button href={resolve(cancelHref as '/accounts')} variant="secondary">Cancelar</Button>
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
