<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { isPositiveAmount } from '#lib/money.ts';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import AmountHero from '#lib/components/AmountHero.svelte';
	import { Button } from '#lib/components/ui/button/index.js';

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

	const path = resolve('plan/rate');
	let rate = $state(untrack(() => initial));
	let fieldError = $state<string | undefined>();
	const shown = $derived(fieldError ?? error);
</script>

<FormShell
	action="{path}?/set"
	{variant}
	onfailure={(data: { errors?: { rate?: string } }) => (fieldError = data.errors?.rate)}
	{onsaved}
	{onclose}
	cancelHref="/plan"
	canSave={isPositiveAmount(rate)}
	scroll
	style="--form-gap: var(--space-3); --form-pb: var(--space-3)"
>
	<p class="label">1 USD =</p>
	<AmountHero bind:value={rate} currency="ARS" name="rate" id="rrate" error={shown} />
	{#if manual && hasTransfer}
		<Button
			type="submit"
			variant="ghost"
			class="use-last-rate"
			formaction="{path}?/auto"
			formnovalidate
		>
			Usar la última compra
		</Button>
	{/if}
</FormShell>

<style>
	.label {
		text-align: center;
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text-muted);
	}

	:global(form .use-last-rate) {
		align-self: center;
		height: 44px;
		font-size: 15px;
		font-weight: 600;
		color: var(--link);
		text-decoration: none;
	}
</style>
