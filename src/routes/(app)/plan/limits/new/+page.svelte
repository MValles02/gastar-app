<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { formatAmountInput, formatMoney } from '$lib/money';
	import { parseStep, planReturn } from '$lib/plan-wizard';
	import FormActions from '$lib/components/FormActions.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const wizard = $derived(page.url.searchParams.get('wizard'));
	const action = $derived(parseStep(wizard) ? `?wizard=${parseStep(wizard)}` : '');
	const back = $derived(planReturn(wizard));

	let categoryId = $state(untrack(() => form?.values.categoryId ?? ''));
	let amount = $state(untrack(() => form?.values.amount ?? ''));
	const suggested = $derived(data.categories.find((c) => c.id === categoryId)?.suggested ?? 0);
</script>

<svelte:head>
	<title>Nuevo límite · Gastar</title>
</svelte:head>

<PageHeader title="Nuevo límite" close={{ href: resolve(back as '/'), label: 'Cerrar' }} />

<form method="POST" {action} use:enhance class="form" novalidate>
	<ul class="card">
		<li class:bad={form?.errors?.categoryId}>
			<OptionPicker
				variant="row"
				name="categoryId"
				legend="Categoría"
				title="Elegí la categoría"
				items={data.categories}
				bind:value={categoryId}
				placeholder="Elegir categoría"
				error={form?.errors?.categoryId}
				errorId="lcategory-error"
			>
				{#snippet empty()}
					<p class="hint pad">Todas tus categorías de gasto ya tienen un límite.</p>
				{/snippet}
			</OptionPicker>
		</li>
		<li class:bad={form?.errors?.amount}>
			<TextRow
				id="lamount"
				name="amount"
				label="Monto"
				bind:value={amount}
				placeholder={data.currency === 'USD' ? '0,00' : '0'}
				inputmode={data.currency === 'USD' ? 'decimal' : 'numeric'}
				amount
				error={form?.errors?.amount}
				errorId="lamount-error"
			/>
		</li>
	</ul>

	{#if suggested > 0}
		<div class="average">
			<p class="hint">Promedio {formatMoney(suggested, data.currency)}</p>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={() => (amount = formatAmountInput(suggested, data.currency))}
			>
				Usar promedio
			</Button>
		</div>
	{/if}

	<FormActions cancelHref={back} submitLabel="Guardar límite" />
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
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
