<script lang="ts">
	import { onMount, tick, untrack, type ComponentProps } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { followRedirect } from '$lib/nav-stack.svelte';
	import { formatAmountInput, formatMoney, parseAmount, type Currency } from '$lib/money';
	import FormActions from '$lib/components/FormActions.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	type Picker = ComponentProps<typeof OptionPicker>['items'][number];

	/**
	 * New category limit. `drawer`: the new-limit drawer (stacked picker, posts to /plan/limits/new and
	 * reports the result instead of navigating). `page`: the full page.
	 */
	let {
		currency,
		action = '',
		cancelHref = '/plan',
		categories = [],
		initial,
		errors,
		variant = 'page',
		onsaved,
		onclose
	}: {
		currency: Currency;
		/** Page: the form's action. Drawer: the query (e.g. `?wizard=4`) added to /plan/limits/new. */
		action?: string;
		cancelHref?: string;
		/** The categories on offer (none has a limit yet), each with its suggested limit. */
		categories?: (Picker & { suggested: number })[];
		initial: { categoryId: string; amount: string };
		errors?: { categoryId?: string; amount?: string };
		variant?: 'page' | 'drawer';
		/** Drawer: the save succeeded. */
		onsaved?: () => void;
		/** Drawer: Cancelar. */
		onclose?: () => void;
	} = $props();

	const drawer = $derived(variant === 'drawer');
	let categoryId = $state(untrack(() => initial.categoryId));
	let amount = $state(untrack(() => initial.amount));
	let mounted = $state(false);
	let submitting = $state(false);
	onMount(() => (mounted = true));

	// Errors from the drawer's post; the page shows the server-rendered `errors` instead.
	let fieldErrors = $state<{ categoryId?: string; amount?: string }>({});
	const shown = $derived({ ...errors, ...fieldErrors });
	const suggested = $derived(categories.find((c) => c.id === categoryId)?.suggested ?? 0);
	const canSave = $derived(categoryId !== '' && (parseAmount(amount) ?? 0) > 0);

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
	action={drawer ? resolve('/plan/limits/new') + action : action}
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
					variant="row"
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
			<li class:bad={shown.amount}>
				<TextRow
					id="lamount"
					name="amount"
					label="Monto"
					bind:value={amount}
					prefix={currency === 'USD' ? 'US$' : '$'}
					placeholder={currency === 'USD' ? '0,00' : '0'}
					inputmode={currency === 'USD' ? 'decimal' : 'numeric'}
					amount
					error={shown.amount}
					errorId="lamount-error"
				/>
			</li>
		</ul>

		{#if suggested > 0}
			<Button
				type="button"
				variant="ghost"
				class="average"
				onclick={() => (amount = formatAmountInput(suggested, currency))}
			>
				Usar promedio · {formatMoney(suggested, currency)}
			</Button>
		{/if}
	</div>

	{#if drawer}
		<div class="actions">
			<Button
				type="button"
				variant="outline"
				class="h-auto min-h-11 min-w-0 flex-1 basis-0 rounded-full"
				onclick={() => onclose?.()}>Cancelar</Button
			>
			<Button
				type="submit"
				class="h-auto min-h-11 min-w-0 flex-1 basis-0 rounded-full"
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
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-decoration: underline;
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

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.hint.pad {
		padding: var(--space-3) var(--space-4);
	}
</style>
