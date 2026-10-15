<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { formatAmountInput, formatMoney } from '$lib/money';
	import { parseStep, planReturn } from '$lib/plan-wizard';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const step = $derived(parseStep(page.url.searchParams.get('wizard')));
	const back = $derived(planReturn(page.url.searchParams.get('wizard')));
	const wizardQuery = $derived(step ? `&wizard=${step}` : '');

	let amount = $state(untrack(() => form?.amount ?? data.amount));
	const formId = 'limit-form';
</script>

<svelte:head>
	<title>Límite de {data.category.name} · Gastar</title>
</svelte:head>

<PageHeader
	title="Límite de {data.category.name}"
	close={{ href: resolve(back as '/'), label: 'Cerrar' }}
/>

<form id={formId} method="POST" action="?/save{wizardQuery}" use:enhance class="form" novalidate>
	<ul class="card">
		<li class="static">
			<span>Categoría</span>
			<span class="value">
				<IconBadge icon={data.category.icon} color={data.category.color} size="1.5rem" />
				<span class="name">{data.category.name}</span>
			</span>
		</li>
		<li class:bad={form?.error}>
			<TextRow
				id="lamount"
				name="amount"
				label="Monto"
				bind:value={amount}
				placeholder={data.currency === 'USD' ? '0,00' : '0'}
				inputmode={data.currency === 'USD' ? 'decimal' : 'numeric'}
				amount
				error={form?.error}
				errorId="lamount-error"
			/>
		</li>
	</ul>

	{#if data.suggested > 0}
		<div class="average">
			<p class="hint">Promedio {formatMoney(data.suggested, data.currency)}</p>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={() => (amount = formatAmountInput(data.suggested, data.currency))}
			>
				Usar promedio
			</Button>
		</div>
	{/if}
</form>

<div class="buttons">
	<Button type="submit" form={formId}>Guardar</Button>
	<ConfirmDialog
		triggerLabel="Eliminar límite"
		triggerVariant="destructive"
		title="¿Eliminar este límite?"
		confirmLabel="Eliminar"
		action="?/delete{wizardQuery}"
	>
		Esta acción no se puede deshacer.
	</ConfirmDialog>
</div>

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

	.average {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	/* Guardar + Eliminar límite side by side, equal width. */
	.buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
		margin-top: var(--space-5);
	}

	.buttons > :global(*) {
		width: 100%;
	}
</style>
