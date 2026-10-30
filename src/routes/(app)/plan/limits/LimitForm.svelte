<script lang="ts">
	import { untrack, type ComponentProps } from 'svelte';
	import { enhance } from '$app/forms';
	import { enhanceRedirect } from '$lib/nav-stack.svelte';
	import { formatAmountInput, formatMoney, type Currency } from '$lib/money';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { SHEET_FORM } from '$lib/sheet.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import LimitList from '../LimitList.svelte';

	type Picker = ComponentProps<typeof OptionPicker>['items'][number];

	/** Shared form for a new and an existing category limit. */
	let {
		mode,
		currency,
		action,
		categories = [],
		category,
		suggested: fixedSuggested = 0,
		initial,
		errors,
		deleteAction,
		progress
	}: {
		mode: 'new' | 'edit';
		currency: Currency;
		action: string;
		/** New: the categories on offer, each with its suggested limit. */
		categories?: (Picker & { suggested: number })[];
		/** Edit: the limit's category. */
		category?: Pick<Picker, 'id' | 'name' | 'icon' | 'color'>;
		/** Edit: the suggested limit of the category. */
		suggested?: number;
		initial: { categoryId: string; amount: string };
		errors?: { categoryId?: string; amount?: string };
		deleteAction?: string;
		/** Edit: the limit's progress this month. */
		progress?: ComponentProps<typeof LimitList>['limits'][number];
	} = $props();

	let categoryId = $state(untrack(() => initial.categoryId));
	let amount = $state(untrack(() => initial.amount));
	const suggested = $derived(
		mode === 'edit' ? fixedSuggested : (categories.find((c) => c.id === categoryId)?.suggested ?? 0)
	);
</script>

{#if progress}
	<div class="progress"><LimitList limits={[progress]} {currency} linked={false} /></div>
{/if}

<form
	id={SHEET_FORM}
	method="POST"
	{action}
	use:enhance={() => enhanceRedirect}
	class="form"
	novalidate
>
	<ul class="card">
		<li class="static">
			<span>Moneda</span>
			<span class="value">{currency}</span>
		</li>
		{#if mode === 'edit' && category}
			<li class="static">
				<span>Categoría</span>
				<span class="value">
					<IconBadge icon={category.icon} color={category.color} size="1.5rem" />
					<span class="name">{category.name}</span>
				</span>
			</li>
		{:else}
			<li class:bad={errors?.categoryId}>
				<OptionPicker
					variant="row"
					name="categoryId"
					legend="Categoría"
					title="Elegí la categoría"
					items={categories}
					bind:value={categoryId}
					placeholder="Elegir"
					error={errors?.categoryId}
					errorId="lcategory-error"
				>
					{#snippet empty()}
						<p class="hint pad">Todas tus categorías de gasto ya tienen un límite.</p>
					{/snippet}
				</OptionPicker>
			</li>
		{/if}
		<li class:bad={errors?.amount}>
			<TextRow
				id="lamount"
				name="amount"
				label="Monto"
				bind:value={amount}
				prefix={currency === 'USD' ? 'US$' : '$'}
				placeholder={currency === 'USD' ? '0,00' : '0'}
				inputmode={currency === 'USD' ? 'decimal' : 'numeric'}
				amount
				error={errors?.amount}
				errorId="lamount-error"
			/>
		</li>
	</ul>

	{#if suggested > 0}
		<div class="average">
			<p class="hint">Promedio últimos 3 meses = {formatMoney(suggested, currency)}</p>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={() => (amount = formatAmountInput(suggested, currency))}
			>
				Usar promedio
			</Button>
		</div>
	{/if}
</form>

{#if mode === 'edit' && deleteAction}
	<ConfirmDialog
		triggerLabel="Eliminar límite"
		triggerVariant="destructive"
		triggerClass="w-full"
		title="¿Eliminar este límite?"
		confirmLabel="Eliminar"
		action={deleteAction}
	>
		Esta acción no se puede deshacer.
	</ConfirmDialog>
{/if}

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-top: var(--space-1);
		padding-bottom: var(--space-3);
	}

	.progress {
		margin-bottom: var(--space-3);
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

	.card > li + li {
		border-top: 1px solid var(--border);
	}

	.card > li.bad {
		box-shadow: inset 3px 0 0 var(--negative);
	}

	.static {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
	}

	.value {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		font-weight: 500;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.hint.pad {
		padding: var(--space-3) var(--space-4);
	}

	.average {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}
</style>
