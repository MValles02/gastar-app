<script lang="ts">
	import { CURRENCIES, CURRENCY_OPTIONS, type Currency } from '#lib/money.ts';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { replaceGoto } from '#lib/nav-stack.svelte.ts';
	import SegmentedControl from './SegmentedControl.svelte';

	/**
	 * ARS | USD switch saved in the `currency` cookie. Default: a radiogroup labelled ARS / USD (Plan,
	 * Reportes). `pills`: two toggle buttons labelled Pesos / Dólares (Inicio).
	 */
	let { value, variant = 'segmented' }: { value: Currency; variant?: 'segmented' | 'pills' } =
		$props();

	let selected = $derived(value as string);
	let form: HTMLFormElement;
	let error = $state('');
	const options = CURRENCIES.map((currency) => ({ value: currency, label: currency }));
	const pills = CURRENCY_OPTIONS;
</script>

<form
	method="POST"
	action="/currency"
	class="currency-tabs"
	class:pills={variant === 'pills'}
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
					refreshAll: true,
					reset: false
				});
				form
					.querySelector<HTMLElement>('[role="radio"][aria-checked="true"], [aria-pressed="true"]')
					?.focus();
			} else {
				await update({ reset: false });
			}
		};
	}}
>
	<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />
	{#if variant === 'pills'}
		<div role="group" aria-label="Moneda" class="pill-group">
			{#each pills as p (p.value)}
				<button type="submit" name="currency" value={p.value} aria-pressed={value === p.value}>
					<span class="pill">{p.label}</span>
				</button>
			{/each}
		</div>
	{:else}
		<span id="currency-tabs-label" class="visually-hidden">Moneda</span>
		<SegmentedControl
			name="currency"
			{options}
			bind:value={selected}
			labelledby="currency-tabs-label"
			onchange={() => form.requestSubmit()}
		/>
	{/if}
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

	.pills {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
	}

	.pill-group {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	/* The 32px pill sits in a 44px button so the tap target meets the minimum. */
	button {
		display: flex;
		align-items: center;
		min-height: var(--tap-target);
		min-width: var(--tap-target);
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		cursor: pointer;
	}

	.pill {
		display: flex;
		align-items: center;
		height: 2rem;
		padding-inline: var(--space-3);
		border-radius: var(--radius-pill);
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text-muted);
		box-shadow: inset 0 0 0 1px var(--border);
	}

	[aria-pressed='true'] .pill {
		background: var(--text);
		color: var(--background);
		box-shadow: none;
	}

	button:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
		border-radius: var(--radius-pill);
	}

	.pills .error {
		flex-basis: 100%;
	}
</style>
