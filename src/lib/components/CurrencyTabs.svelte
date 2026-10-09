<script lang="ts">
	import { CURRENCIES, type Currency } from '$lib/money';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SegmentedControl from './SegmentedControl.svelte';

	/** ARS | USD radiogroup saved in the `currency` cookie. */
	let { value }: { value: Currency } = $props();

	let selected = $derived(value as string);
	let form: HTMLFormElement;
	let error = $state('');
	const options = CURRENCIES.map((currency) => ({ value: currency, label: currency }));
</script>

<form
	method="POST"
	action="/currency"
	class="currency-tabs"
	bind:this={form}
	use:enhance={() => {
		error = '';
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				// update() only applies the result on the action's own route, so keep it locally.
				error = (result.data?.currencyError as string | undefined) ?? '';
			} else if (result.type === 'redirect') {
				// eslint-disable-next-line svelte/no-navigation-without-resolve -- server-validated same-origin redirect location
				await goto(result.location, { invalidateAll: true, keepFocus: true, noScroll: true });
				form.querySelector<HTMLInputElement>('input[name="currency"]:checked')?.focus();
			} else {
				await update({ reset: false });
			}
		};
	}}
>
	<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />
	<span id="currency-tabs-label" class="visually-hidden">Moneda</span>
	<SegmentedControl
		name="currency"
		{options}
		bind:value={selected}
		labelledby="currency-tabs-label"
		onchange={() => form.requestSubmit()}
	/>
	<noscript><button type="submit">Guardar</button></noscript>
	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}
</form>

<style>
	.error {
		margin: var(--space-2) 0 0;
		font-size: var(--font-size-sm);
		color: var(--negative);
	}
</style>
