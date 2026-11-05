<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { followRedirect } from '$lib/nav-stack.svelte';
	import { NAME_MAX_LENGTH } from '$lib/limits';
	import { ACCOUNT_ICONS, type AccountIconKey, type SwatchKey } from '$lib/appearance';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import FormActions from '$lib/components/FormActions.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import IconColorDrawer from '$lib/components/IconColorDrawer.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';

	type Values = Partial<
		Record<'name' | 'currency' | 'initialBalance' | 'icon' | 'color', string | null>
	>;

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
		errors?: Partial<Record<keyof Values, string>>;
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
	let submitting = $state(false);
	onMount(() => (mounted = true));

	// Errors from the drawer's post; the page shows the server-rendered `errors` instead.
	let fieldErrors = $state<typeof errors>({});
	const shown = $derived({ ...errors, ...fieldErrors });

	// After a failed submit, move focus to the first field marked invalid.
	const focusFirstError = () =>
		tick().then(() => document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus());
	$effect(() => {
		if (Object.values(errors).some(Boolean)) focusFirstError();
	});
</script>

<form
	method="POST"
	action={drawer ? resolve('/accounts/new') : ''}
	class="form"
	class:drawer
	novalidate
	use:enhance={() => {
		submitting = true;
		return async (input) => {
			if (!drawer) {
				await followRedirect(input);
				submitting = false;
				return;
			}
			const { result } = input;
			if (result.type === 'redirect') onsaved?.();
			else if (result.type === 'failure') {
				fieldErrors = (result.data?.errors ?? {}) as typeof errors;
				focusFirstError();
			} else toast.error('No se pudo guardar.');
			submitting = false;
		};
	}}
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
				placeholder="Nombre"
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
		<Field.Label for="initialBalance">Saldo inicial</Field.Label>
		<Input
			id="initialBalance"
			name="initialBalance"
			inputmode="decimal"
			placeholder={currency === 'USD' ? 'US$ 0' : '$ 0'}
			autocomplete="off"
			aria-invalid={shown.initialBalance ? 'true' : undefined}
			aria-describedby={shown.initialBalance ? 'balance-error' : undefined}
			class="h-11"
			bind:value={initialBalance}
		/>
		{#if shown.initialBalance}
			<p class="error" id="balance-error" role="alert">{shown.initialBalance}</p>
		{/if}
	</Field.Field>

	{#if drawer}
		<div class="actions">
			<Button
				type="button"
				variant="outline"
				class="h-auto min-h-11 min-w-0 flex-1 basis-0"
				onclick={() => onclose?.()}>Cancelar</Button
			>
			<Button
				type="submit"
				class="h-auto min-h-11 min-w-0 flex-1 basis-0"
				disabled={!name.trim() || submitting}>Guardar</Button
			>
		</div>
	{:else}
		<FormActions cancelHref="/accounts" submitLabel="Guardar" {submitting} />
	{/if}
</form>

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
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-top: var(--space-1);
	}

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
		font-size: var(--font-size-base);
		color: var(--text);
	}

	.actions {
		display: flex;
		gap: var(--space-3);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
