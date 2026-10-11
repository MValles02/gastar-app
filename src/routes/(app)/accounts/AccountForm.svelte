<script lang="ts">
	import { NAME_MAX_LENGTH } from '$lib/limits';
	import { tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import Card from '$lib/components/Card.svelte';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import IconPicker from '$lib/components/IconPicker.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import type { AccountIconKey, SwatchKey } from '$lib/appearance';
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
			<label class="row">
				<span class="k">Nombre</span>
				<input
					name="name"
					type="text"
					maxlength={NAME_MAX_LENGTH}
					required
					autocomplete="off"
					placeholder="Agregar"
					bind:value={name}
					aria-invalid={errors.name ? 'true' : undefined}
					aria-describedby={errors.name ? 'name-error' : undefined}
				/>
			</label>
			{#if errors.name}
				<p class="error et" id="name-error" role="alert">
					<Icon name="alert" size="1rem" />{errors.name}
				</p>
			{/if}
		</li>

		<li class:bad={errors.currency}>
			<div class="row">
				<span id="currency-label" class="k">Moneda</span>
				<div class="seg">
					<SegmentedControl
						name="currency"
						options={currencyOptions}
						bind:value={currency}
						labelledby="currency-label"
						disabled={currencyLocked}
					/>
				</div>
			</div>
			{#if errors.currency}
				<p class="error et" role="alert"><Icon name="alert" size="1rem" />{errors.currency}</p>
			{/if}
		</li>

		<li class:bad={errors.initialBalance}>
			<label class="row">
				<span class="k">Saldo inicial</span>
				<input
					class="balance"
					name="initialBalance"
					type="text"
					inputmode="decimal"
					placeholder={currency === 'USD' ? '0,00' : '0'}
					autocomplete="off"
					bind:value={initialBalance}
					aria-invalid={errors.initialBalance ? 'true' : undefined}
					aria-describedby={errors.initialBalance ? 'balance-error' : undefined}
				/>
			</label>
			{#if errors.initialBalance}
				<p class="error et" id="balance-error" role="alert">
					<Icon name="alert" size="1rem" />{errors.initialBalance}
				</p>
			{/if}
		</li>
	</ul>
	{#if currencyLocked}
		<p class="hint after">No se puede cambiar porque la cuenta tiene movimientos.</p>
	{/if}

	<div>
		<Card>
			<IconPicker name="icon" legend="Ícono" bind:value={icon} {color} />
		</Card>
		{#if errors.icon}<p class="error pad" role="alert">
				<Icon name="alert" size="1rem" />{errors.icon}
			</p>{/if}
	</div>

	<div>
		<Card>
			<ColorPicker name="color" legend="Color" bind:value={color} />
		</Card>
		{#if errors.color}<p class="error pad" role="alert">
				<Icon name="alert" size="1rem" />{errors.color}
			</p>{/if}
	</div>

	<div class="bar">
		<Button type="submit" class="w-full"
			>{mode === 'create' ? 'Crear cuenta' : 'Guardar cambios'}</Button
		>
	</div>
	<div class="cancel">
		<Button href={resolve(cancelHref as '/accounts')} variant="outline">Cancelar</Button>
	</div>
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
		cursor: text;
	}

	.row input[name='name'],
	.row input.balance {
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

	.row input.balance {
		font-family: var(--font-display);
		font-size: var(--font-size-lg);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.row input:focus-visible {
		outline-offset: -2px;
	}

	.row input::placeholder {
		color: var(--text-muted);
		opacity: 1;
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

	.hint.after {
		margin-top: calc(var(--space-4) * -1);
		padding-inline: var(--space-4);
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

	.pad {
		padding: var(--space-2) var(--space-4) 0;
	}

	/* Sticky save bar: full-bleed, pinned to the bottom of the viewport (no tab bar on this screen). */
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

	.cancel {
		display: flex;
		justify-content: center;
	}
</style>
