<script lang="ts">
	import { untrack, type ComponentProps } from 'svelte';
	import { resolve } from '$app/paths';
	import { formatAmountInput, formatMoney, isPositiveAmount, type Currency } from '#lib/money.ts';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import OptionPicker from '#lib/components/OptionPicker.svelte';
	import AmountHero from '#lib/components/AmountHero.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import { Button } from '#lib/components/ui/button/index.js';

	type Picker = ComponentProps<typeof OptionPicker>['items'][number];
	type Errors = { categoryId?: string; amount?: string; currency?: string };

	/**
	 * New category limit. `drawer`: the new-limit drawer (stacked picker, posts to /plan/limits/new and
	 * reports the result instead of navigating). `page`: the full page.
	 */
	let {
		action = '',
		cancelHref = '/plan',
		categories = [],
		initial,
		errors,
		variant = 'page',
		onsaved,
		onclose
	}: {
		/** Page: the form's action. Drawer: the query (e.g. `?wizard=4`) added to /plan/limits/new. */
		action?: string;
		cancelHref?: string;
		/** The categories on offer (none has a limit yet), each with its suggested limit. */
		categories?: (Picker & { suggested: Record<Currency, number> })[];
		initial: { categoryId: string; amount: string; currency: Currency };
		errors?: Errors;
		variant?: 'page' | 'drawer';
		/** Drawer: the save succeeded. */
		onsaved?: () => void;
		/** Drawer: Cancelar. */
		onclose?: () => void;
	} = $props();

	const drawer = $derived(variant === 'drawer');
	let categoryId = $state(untrack(() => initial.categoryId));
	let amount = $state(untrack(() => initial.amount));
	let currency = $state<Currency>(untrack(() => initial.currency));
	const currencyOptions = [
		{ value: 'ARS', label: 'Pesos' },
		{ value: 'USD', label: 'Dólares' }
	];

	// Errors from the drawer's post; the page shows the server-rendered `errors` instead.
	let fieldErrors = $state<Errors>({});
	const shown = $derived({ ...errors, ...fieldErrors });
	const suggested = $derived(categories.find((c) => c.id === categoryId)?.suggested[currency] ?? 0);
</script>

<FormShell
	action={drawer ? resolve('plan/limits/new') + action : action}
	{variant}
	onfailure={(data: { errors?: Errors }) => (fieldErrors = data.errors ?? {})}
	{onsaved}
	{onclose}
	{cancelHref}
	canSave={categoryId !== '' && isPositiveAmount(amount)}
	scroll
	style="--form-gap: var(--space-3); --form-pb: var(--space-3)"
>
	<ul class="card">
		<li class:bad={shown.categoryId}>
			<OptionPicker
				name="categoryId"
				legend="Categoría"
				title="Elegí la categoría"
				items={categories}
				bind:value={categoryId}
				nested={drawer}
				placeholder="Elegir"
				error={shown.categoryId}
				errorId="lcategory-error"
			>
				{#snippet empty()}
					<p class="hint pad">Todas tus categorías de gasto ya tienen un límite.</p>
				{/snippet}
			</OptionPicker>
		</li>
	</ul>

	<div class="field">
		<span id="lcurrency-label" class="label">Moneda</span>
		<SegmentedControl
			name="currency"
			options={currencyOptions}
			bind:value={currency}
			labelledby="lcurrency-label"
		/>
		{#if shown.currency}<p class="error" role="alert">{shown.currency}</p>{/if}
	</div>

	<AmountHero bind:value={amount} {currency} error={shown.amount} id="lamount" />

	{#if suggested > 0}
		<Button
			type="button"
			variant="ghost"
			class="use-average"
			onclick={() => (amount = formatAmountInput(suggested, currency))}
		>
			Usar promedio · {formatMoney(suggested, currency)}
		</Button>
	{/if}
</FormShell>

<style>
	:global(form .use-average) {
		align-self: center;
		height: 44px;
		font-size: 15px;
		font-weight: 600;
		color: var(--link);
		text-decoration: none;
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

	.card > li.bad {
		box-shadow: inset 3px 0 0 var(--negative);
	}

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

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.hint.pad {
		padding: var(--space-3) var(--space-4);
	}
</style>
