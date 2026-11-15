<script lang="ts">
	import { onMount, tick, untrack, type ComponentProps } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { followRedirect } from '#lib/nav-stack.svelte.ts';
	import { formatAmountInput, formatMoney, isPositiveAmount, type Currency } from '#lib/money.ts';
	import FormActions from '#lib/components/FormActions.svelte';
	import OptionPicker from '#lib/components/OptionPicker.svelte';
	import AmountHero from '#lib/components/AmountHero.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import { Button } from '#lib/components/ui/button/index.js';

	type Picker = ComponentProps<typeof OptionPicker>['items'][number];

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

		/** Page: the form's action. Drawer: the query (e.g. `?wizard=4`) added to /plan/limits/new. */
		/** The categories on offer (none has a limit yet), each with its suggested limit. */
		/** Drawer: the save succeeded. */
		/** Drawer: Cancelar. */
	}: {
		action?: string;
		cancelHref?: string;
		categories?: (Picker & { suggested: Record<Currency, number> })[];
		initial: { categoryId: string; amount: string; currency: Currency };
		errors?: { categoryId?: string; amount?: string; currency?: string };
		variant?: 'page' | 'drawer';
		onsaved?: () => void;
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
	let mounted = $state(false);
	let submitting = $state(false);
	onMount(() => (mounted = true));

	// Errors from the drawer's post; the page shows the server-rendered `errors` instead.
	let fieldErrors = $state<{ categoryId?: string; amount?: string; currency?: string }>({});
	const shown = $derived({ ...errors, ...fieldErrors });
	const suggested = $derived(categories.find((c) => c.id === categoryId)?.suggested[currency] ?? 0);
	const canSave = $derived(categoryId !== '' && isPositiveAmount(amount));

	const focusFirstError = () =>
		tick().then(() => {
			document
				.querySelector<HTMLElement>(
					'form [aria-invalid="true"], form button[aria-describedby$="-error"]'
				)
				?.focus();
		});
</script>

<form
	method="POST"
	action={drawer ? resolve('plan/limits/new') + action : action}
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
				fieldErrors = (result.data?.errors ?? {}) as typeof fieldErrors;
				focusFirstError();
			} else toast.error('No se pudo guardar.');
			submitting = false;
		};
	}}
>
	<div class="scroll">
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
				class="average"
				onclick={() => (amount = formatAmountInput(suggested, currency))}
				>Usar promedio · {formatMoney(suggested, currency)}</Button
			>
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
		<FormActions {cancelHref} submitLabel="Guardar" {submitting} />
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

	.scroll :global(.average) {
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
