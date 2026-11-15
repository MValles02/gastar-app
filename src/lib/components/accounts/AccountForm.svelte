<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { NAME_MAX_LENGTH } from '#lib/fields.ts';
	import { ACCOUNT_ICONS, type AccountIconKey, type SwatchKey } from '#lib/appearance.ts';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import IconBadge from '#lib/components/IconBadge.svelte';
	import IconColorDrawer from '#lib/components/IconColorDrawer.svelte';
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
		variant = 'page',
		onsaved,
		onclose
	}: {
		initial: Values;
		errors?: Errors;
		variant?: 'page' | 'drawer';
		/** Drawer: the save succeeded. */
		onsaved?: () => void;
		/** Drawer: Cancelar. */
		onclose?: () => void;
	} = $props();

	const drawer = $derived(variant === 'drawer');
	const currencyOptions = [
		{ value: 'ARS', label: 'Pesos' },
		{ value: 'USD', label: 'Dólares' }
	];

	let name = $state(untrack(() => initial.name ?? ''));
	let initialBalance = $state(untrack(() => initial.initialBalance ?? ''));
	let currency = $state(untrack(() => initial.currency || 'ARS'));
	let icon = $state(untrack(() => (initial.icon ?? 'wallet') as AccountIconKey));
	let color = $state(untrack(() => (initial.color ?? 'green') as SwatchKey));
	let glyphOpen = $state(false);
	let mounted = $state(false);

	// Errors from the drawer's post; the page shows the server-rendered `errors` instead.
	let fieldErrors = $state<Errors>({});
	const shown = $derived({ ...errors, ...fieldErrors });
</script>

<FormShell
	action={drawer ? resolve('accounts/new') : ''}
	{variant}
	{errors}
	onfailure={(data: { errors?: Errors }) => (fieldErrors = data.errors ?? {})}
	{onsaved}
	{onclose}
	cancelHref="/accounts"
	canSave={!!name.trim()}
	bind:mounted
>
	<div class="head">
		{#if mounted}
			<button
				type="button"
				class="glyph"
				aria-label="Ícono y color"
				aria-haspopup="dialog"
				onclick={() => (glyphOpen = true)}
			>
				<IconBadge {icon} {color} size="2.75rem" />
			</button>
		{/if}
		<Field.Field class="flex-1">
			<Field.Label for="name" class="visually-hidden">Nombre</Field.Label>
			<Input
				id="name"
				name="name"
				placeholder="Ej.: Banco Galicia"
				autocomplete="off"
				maxlength={NAME_MAX_LENGTH}
				aria-invalid={shown.name ? 'true' : undefined}
				aria-describedby={shown.name ? 'name-error' : undefined}
				class="h-11"
				bind:value={name}
			/>
		</Field.Field>
	</div>
	{#if shown.name}<p class="error" id="name-error" role="alert">{shown.name}</p>{/if}
	{#if shown.icon}<p class="error" role="alert">{shown.icon}</p>{/if}
	{#if shown.color}<p class="error" role="alert">{shown.color}</p>{/if}
	<input type="hidden" name="icon" value={icon} />
	<input type="hidden" name="color" value={color} />

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
			placeholder={currency === 'USD' ? 'US$ 0' : '$ 0'}
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

<IconColorDrawer
	bind:open={glyphOpen}
	nested={drawer}
	icons={ACCOUNT_ICONS}
	{icon}
	{color}
	onpick={(pick) => {
		icon = pick.icon;
		color = pick.color;
	}}
/>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.glyph {
		flex: none;
		display: grid;
		place-items: center;
		min-width: var(--tap-target);
		min-height: var(--tap-target);
		padding: 0;
		border: 0;
		background: transparent;
	}

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
