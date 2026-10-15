<script lang="ts">
	import { NAME_MAX_LENGTH } from '$lib/limits';
	import { tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Lock from '@lucide/svelte/icons/lock';
	import * as Field from '$lib/components/ui/field/index.js';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import IconPicker from '$lib/components/IconPicker.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import { ACCOUNT_ICONS, type AccountIconKey, type SwatchKey } from '$lib/appearance';
	import { CURRENCIES } from '$lib/money';

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

	const currencyOptions = CURRENCIES.map((c) => ({ value: c, label: c }));

	// After a failed submit, move focus to the first field marked invalid.
	$effect(() => {
		if (!Object.values(errors).some(Boolean)) return;
		tick().then(() => {
			document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus();
		});
	});
</script>

<form method="POST" use:enhance class="form" novalidate>
	<ul class="card">
		<li class:bad={errors.name}>
			<TextRow
				id="name"
				name="name"
				label="Nombre"
				bind:value={name}
				placeholder="Agregar"
				maxlength={NAME_MAX_LENGTH}
				required
				error={errors.name}
				errorId="name-error"
			/>
		</li>

		<li class:bad={errors.currency}>
			{#if currencyLocked}
				<p class="row locked">
					<span>Moneda</span>
					<span class="v">
						{currency}
						<Lock size={16} strokeWidth={1.75} aria-hidden="true" />
					</span>
				</p>
				<p class="hint pad">No se puede cambiar porque la cuenta tiene movimientos.</p>
			{:else}
				<div class="row">
					<Field.Label id="currency-label" class="text-base font-normal">Moneda</Field.Label>
					<div class="seg">
						<SegmentedControl
							name="currency"
							options={currencyOptions}
							bind:value={currency}
							labelledby="currency-label"
						/>
					</div>
				</div>
			{/if}
			{#if errors.currency}
				<p class="error et" role="alert"><Icon name="alert" size="1rem" />{errors.currency}</p>
			{/if}
		</li>

		<li class:bad={errors.initialBalance}>
			<TextRow
				id="initialBalance"
				name="initialBalance"
				label="Saldo inicial"
				bind:value={initialBalance}
				placeholder={currency === 'USD' ? '0,00' : '0'}
				inputmode="decimal"
				amount
				error={errors.initialBalance}
				errorId="balance-error"
			/>
		</li>

		<li class:bad={errors.icon}>
			<IconPicker name="icon" legend="Ícono" options={ACCOUNT_ICONS} bind:value={icon} {color} />
			{#if errors.icon}<p class="error et" role="alert">
					<Icon name="alert" size="1rem" />{errors.icon}
				</p>{/if}
		</li>

		<li class:bad={errors.color}>
			<ColorPicker name="color" legend="Color" bind:value={color} />
			{#if errors.color}<p class="error et" role="alert">
					<Icon name="alert" size="1rem" />{errors.color}
				</p>{/if}
		</li>
	</ul>
	<FormActions {cancelHref} submitLabel={mode === 'create' ? 'Crear cuenta' : 'Guardar cambios'} />
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
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

	.seg {
		margin-inline-start: auto;
		flex: 0 1 8rem;
		min-width: 0;
		padding-block: var(--space-1);
	}

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.hint.pad {
		padding: 0 var(--space-4) var(--space-3);
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

	.error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.et {
		padding: 0 var(--space-4) var(--space-3);
	}
</style>
