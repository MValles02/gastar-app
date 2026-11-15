<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { followRedirect } from '$lib/nav-stack.svelte';
	import { isPositiveAmount } from '$lib/money';
	import FormActions from '$lib/components/FormActions.svelte';
	import AmountHero from '$lib/components/AmountHero.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * The plan's USD rate. `drawer`: opened over the plan (posts to /plan/rate and reports the result
	 * instead of navigating). `page`: the full page.
	 */
	let {
		initial,
		manual,
		hasTransfer,
		error,
		variant = 'page',
		onsaved,
		onclose
	}: {
		/** The rate shown to edit (es-AR input). */
		initial: string;
		/** A manual rate is set. */
		manual: boolean;
		hasTransfer: boolean;
		error?: string;
		variant?: 'page' | 'drawer';
		/** Drawer: the save succeeded. */
		onsaved?: () => void;
		/** Drawer: Cancelar. */
		onclose?: () => void;
	} = $props();

	const drawer = $derived(variant === 'drawer');
	const path = resolve('/plan/rate');
	let rate = $state(untrack(() => initial));
	let mounted = $state(false);
	let submitting = $state(false);
	let fieldError = $state<string | undefined>();
	onMount(() => (mounted = true));
	const shown = $derived(fieldError ?? error);
	const canSave = $derived(isPositiveAmount(rate));

	const focusError = () =>
		tick().then(() => document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus());
</script>

<form
	method="POST"
	action="{path}?/set"
	class="form"
	class:drawer
	class:submitting
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
				fieldError = (result.data?.errors as { rate?: string } | undefined)?.rate;
				focusError();
			} else toast.error('No se pudo guardar.');
			submitting = false;
		};
	}}
>
	<div class="scroll">
		<p class="label">1 USD =</p>
		<AmountHero bind:value={rate} currency="ARS" name="rate" id="rrate" error={shown} />
		{#if manual && hasTransfer}
			<Button type="submit" variant="ghost" class="auto" formaction="{path}?/auto" formnovalidate>
				Usar la última compra
			</Button>
		{/if}
	</div>

	{#if drawer}
		<div class="actions">
			<Button
				type="button"
				variant="outline"
				class="min-w-0 flex-1 basis-0"
				onclick={() => onclose?.()}>Cancelar</Button
			>
			<Button
				type="submit"
				class="min-w-0 flex-1 basis-0"
				disabled={mounted && (!canSave || submitting)}
				aria-busy={submitting ? 'true' : undefined}>Guardar</Button
			>
		</div>
	{:else}
		<FormActions cancelHref="/plan" submitLabel="Guardar" {submitting} />
	{/if}
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-top: var(--space-1);
		padding-bottom: var(--space-3);
	}

	.form.drawer {
		flex: 1;
		min-height: 0;
		gap: 0;
		padding: 0;
	}

	.scroll {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-height: 0;
		overflow-y: auto;
	}

	.drawer .scroll {
		padding: var(--space-1) var(--space-4) var(--space-4);
	}

	.form.submitting .scroll {
		opacity: 0.55;
	}

	.label {
		text-align: center;
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text-muted);
	}

	.scroll :global(.auto) {
		align-self: center;
		height: 44px;
		font-size: 15px;
		font-weight: 600;
		color: var(--link);
		text-decoration: none;
	}

	.actions {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--popover);
	}
</style>
