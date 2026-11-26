<script lang="ts">
	import { CURRENCY_OPTIONS, CURRENCY_SYMBOL, DEFAULT_CURRENCY, toCurrency } from '#lib/money.ts';
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { ACCOUNT_ICONS, type AccountIconKey, type SwatchKey } from '#lib/appearance.ts';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import { formScreen } from '#lib/components/forms/form-enhance.ts';
	import GlyphNameHead from '#lib/components/GlyphNameHead.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';

	type Values = Partial<
		Record<'name' | 'currency' | 'initialBalance' | 'icon' | 'color', string | null>
	>;
	type Errors = Partial<Record<keyof Values, string>>;

	/**
	 * The new-account form. `drawer`: the "Nueva cuenta" drawer (Guardar waits for a name, posts to
	 * /accounts/new and reports the result instead of navigating). `page`: the /accounts/new page.
	 */
	let {
		initial,
		errors = {},
		onsaved,
		onclose
	}: {
		initial: Values;
		errors?: Errors;
		/** Drawer: the save succeeded. */
		onsaved?: () => void;
		/** Drawer: Cancelar. */
		onclose?: () => void;
	} = $props();

	const drawer = formScreen().variant === 'drawer';
	const currencyOptions = CURRENCY_OPTIONS;

	let name = $state(untrack(() => initial.name ?? ''));
	let initialBalance = $state(untrack(() => initial.initialBalance ?? ''));
	let currency = $state(untrack(() => initial.currency || DEFAULT_CURRENCY));
	let icon = $state(untrack(() => (initial.icon ?? 'wallet') as AccountIconKey));
	let color = $state(untrack(() => (initial.color ?? 'green') as SwatchKey));

	// Errors from the drawer's post; the page shows the server-rendered `errors` instead.
	let fieldErrors = $state<Errors>({});
	const shown = $derived({ ...errors, ...fieldErrors });
</script>

<FormShell
	action={drawer ? resolve('accounts/new') : ''}
	{errors}
	onfailure={(data: { errors?: Errors }) => (fieldErrors = data.errors ?? {})}
	{onsaved}
	{onclose}
	cancelHref="/accounts"
	canSave={!!name.trim()}
>
	<GlyphNameHead
		bind:name
		bind:icon
		bind:color
		icons={ACCOUNT_ICONS}
		placeholder="Ej.: Banco Galicia"
		invalid={!!shown.name}
		describedby={shown.name ? 'name-error' : undefined}
	/>
	{#if shown.name}<p class="error" id="name-error" role="alert">{shown.name}</p>{/if}
	{#if shown.icon}<p class="error" role="alert">{shown.icon}</p>{/if}
	{#if shown.color}<p class="error" role="alert">{shown.color}</p>{/if}

	<div class="field">
		<span id="currency-label" class="label">Moneda</span>
		<SegmentedControl
			name="currency"
			options={currencyOptions}
			bind:value={currency}
			labelledby="currency-label"
		/>
	</div>
	{#if shown.currency}<p class="error" role="alert">{shown.currency}</p>{/if}

	<Field.Field>
		<Field.Label for="initialBalance" class="text-[0.8125rem] font-medium text-(--text-muted)"
			>Saldo inicial</Field.Label
		>
		<Input
			id="initialBalance"
			name="initialBalance"
			inputmode="decimal"
			placeholder={`${CURRENCY_SYMBOL[toCurrency(currency)]} 0`}
			autocomplete="off"
			aria-invalid={shown.initialBalance ? 'true' : undefined}
			aria-describedby={shown.initialBalance ? 'balance-error' : undefined}
			class="h-[50px] rounded-xl px-3.5"
			bind:value={initialBalance}
		/>
		{#if shown.initialBalance}
			<p class="error" id="balance-error" role="alert">{shown.initialBalance}</p>
		{/if}
	</Field.Field>
</FormShell>

<style>
	/* Label above, the control across the full row, so the options do not squeeze and wrap. */
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-muted);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
