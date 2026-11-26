<script lang="ts">
	import { untrack, type ComponentProps } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		CURRENCY_OPTIONS,
		formatAmountInput,
		formatMoney,
		isPositiveAmount,
		type Currency
	} from '#lib/money.ts';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import { formScreen } from '#lib/components/forms/form-enhance.ts';
	import OptionPicker from '#lib/components/pickers/OptionPicker.svelte';
	import AmountInput from '#lib/components/AmountInput.svelte';
	import DetailCard from '#lib/components/DetailCard.svelte';
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
		categories = [],
		initial,
		errors
	}: {
		/** Page: the form's action. Drawer: the query (e.g. `?wizard=4`) added to /plan/limits/new. */
		action?: string;
		/** The categories on offer (none has a limit yet), each with its suggested limit. */
		categories?: (Picker & { suggested: Record<Currency, number> })[];
		initial: { categoryId: string; amount: string; currency: Currency };
		errors?: Errors;
	} = $props();

	const drawer = formScreen().variant === 'drawer';
	let categoryId = $state(untrack(() => initial.categoryId));
	let amount = $state(untrack(() => initial.amount));
	let currency = $state<Currency>(untrack(() => initial.currency));
	const currencyOptions = CURRENCY_OPTIONS;

	// Errors from the drawer's post; the page shows the server-rendered `errors` instead.
	let fieldErrors = $state<Errors>({});
	const shown = $derived({ ...errors, ...fieldErrors });
	const suggested = $derived(categories.find((c) => c.id === categoryId)?.suggested[currency] ?? 0);
</script>

<FormShell
	action={drawer ? resolve('plan/limits/new') + action : action}
	onfailure={(data: { errors?: Errors }) => (fieldErrors = data.errors ?? {})}
	canSave={categoryId !== '' && isPositiveAmount(amount)}
	scroll
	style="--form-gap: var(--space-3); --form-pb: var(--space-3)"
>
	<DetailCard>
		<li class:bad={shown.categoryId}>
			<OptionPicker
				name="categoryId"
				legend="Categoría"
				title="Elegí la categoría"
				items={categories}
				bind:value={categoryId}
				placeholder="Elegir"
				error={shown.categoryId}
				errorId="lcategory-error"
			>
				{#snippet empty()}
					<p class="hint pad">Todas tus categorías de gasto ya tienen un límite.</p>
				{/snippet}
			</OptionPicker>
		</li>
	</DetailCard>

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

	<AmountInput bind:value={amount} {currency} error={shown.amount} id="lamount" />

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
