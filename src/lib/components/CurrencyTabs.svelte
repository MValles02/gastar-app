<script lang="ts">
	import { CURRENCIES, type Currency } from '$lib/money';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { replaceGoto } from '$lib/nav-stack.svelte';
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
				// Switching currency is not a new screen: overwrite the entry so back skips it.
				await replaceGoto(result.location, {
					invalidateAll: true,
					keepFocus: true,
					noScroll: true
				});
				form.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
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
