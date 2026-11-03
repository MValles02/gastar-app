<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DetailHero from '$lib/components/DetailHero.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const item = $derived(data.item);
	const errors = $derived((form?.errors ?? {}) as Record<string, string | undefined>);
	const formError = $derived(errors.form ?? errors.accountId);

	const typeOptions = $derived([
		item.isCredit ? { value: 'income', label: 'Ingreso' } : { value: 'outcome', label: 'Gasto' },
		{ value: 'transfer', label: 'Transf.' }
	]);

	const initial = untrack(() => form?.values ?? data.initial);
	let type = $state(initial.type);
	let description = $state(initial.description);
	let categoryId = $state(initial.categoryId);
	let counterId = $state(initial.counterAccountId);
	let remember = $state(initial.remember === 'on');

	let mounted = $state(false);
	onMount(() => (mounted = true));
	let submitting = $state(false);

	const isTransfer = $derived(type === 'transfer');
	const showTransfer = $derived(!mounted || isTransfer);
	const showCategory = $derived(!mounted || !isTransfer);

	// Without JS the type changes without a reload, so every category is listed (the server validates).
	const pickableCategories = $derived(
		!mounted || isTransfer
			? data.categories
			: data.categories.filter((c) => c.kind === null || c.kind === type)
	);
	$effect(() => {
		if (categoryId && !pickableCategories.some((c) => c.id === categoryId)) categoryId = '';
	});

	// After a failed submit, move focus to the first field marked invalid.
	$effect(() => {
		if (!Object.values(errors).some(Boolean)) return;
		tick().then(() => {
			document
				.querySelector<HTMLElement>(
					'form [aria-invalid="true"], form button[aria-describedby$="-error"]'
				)
				?.focus();
		});
	});
</script>

<svelte:head>
	<title>Revisar movimiento · Gastar</title>
</svelte:head>

<div class="detail">
	<PageHeader
		title="Revisar movimiento"
		back={{ href: resolve('/imports'), label: 'Volver a Mercado Pago' }}
	/>

	<DetailHero
		cents={item.isCredit ? item.amount : -item.amount}
		currency="ARS"
		tone="flow"
		direction={item.isCredit ? 'income' : 'outcome'}
		label={item.isCredit ? 'Dinero recibido' : 'Dinero enviado'}
		ariaLabel="Monto"
	/>

	<dl class="data">
		<div class="item">
			<dt>Fecha</dt>
			<dd>{item.dateLabel}</dd>
		</div>
		{#if item.counterpartyNickname}
			<div class="item">
				<dt>Contraparte</dt>
				<dd>{item.counterpartyNickname}</dd>
			</div>
		{/if}
		<div class="item">
			<dt>Original</dt>
			<dd>{item.rawDescription}</dd>
		</div>
	</dl>

	{#if data.review}
		<p class="hint">Revisar tipo: no pudimos saber qué es este movimiento.</p>
	{/if}

	<form
		method="POST"
		action="?/approve"
		class="form"
		class:submitting
		novalidate
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<div class="field">
			<span id="type-label" class="visually-hidden">Tipo</span>
			<SegmentedControl
				name="type"
				options={typeOptions}
				bind:value={type}
				labelledby="type-label"
			/>
			{#if errors.type}<p class="error" role="alert">{errors.type}</p>{/if}
		</div>

		<ul class="card">
			<li class:bad={errors.description}>
				<TextRow
					id="description"
					name="description"
					label="Descripción"
					bind:value={description}
					placeholder="Agregar"
					maxlength={DESCRIPTION_MAX_LENGTH}
					required
					error={errors.description}
					errorId="description-error"
				/>
			</li>

			{#if showTransfer}
				<li class:bad={errors.counterAccountId}>
					{#if !mounted}<p class="hint pad">Solo para transferencias</p>{/if}
					<OptionPicker
						variant="row"
						name="counterAccountId"
						legend={item.isCredit ? 'Origen' : 'Destino'}
						title={item.isCredit ? 'Elegí la cuenta de origen' : 'Elegí la cuenta de destino'}
						items={data.accounts}
						bind:value={counterId}
						placeholder="Elegir"
						error={errors.counterAccountId}
						errorId="counter-error"
					>
						{#snippet empty()}
							<p class="hint pad">
								Necesitás otra cuenta en pesos.
								<a href={resolve('/accounts/new')}>Crear cuenta</a>
							</p>
							{#if errors.counterAccountId}<p class="error pad" role="alert">
									{errors.counterAccountId}
								</p>{/if}
						{/snippet}
					</OptionPicker>
				</li>
			{/if}

			{#if showCategory}
				<li class:bad={errors.categoryId}>
					{#if !mounted}<p class="hint pad">Solo para ingresos y gastos</p>{/if}
					<OptionPicker
						variant="row"
						name="categoryId"
						legend="Categoría"
						title="Elegí la categoría"
						items={pickableCategories}
						bind:value={categoryId}
						placeholder="Elegir"
						error={errors.categoryId}
						errorId="category-error"
					>
						{#snippet empty()}
							<p class="hint pad">
								Todavía no tenés categorías.
								<a href={resolve('/categories/new')}>Crear categoría</a>
							</p>
							{#if errors.categoryId}<p class="error pad" role="alert">{errors.categoryId}</p>{/if}
						{/snippet}
					</OptionPicker>
				</li>
			{/if}
		</ul>

		{#if data.rememberLabel}
			<Field.Field orientation="horizontal">
				<Checkbox id="remember" name="remember" bind:checked={remember} />
				<Field.Content>
					<Field.Label for="remember">Recordar para la próxima</Field.Label>
					<Field.Description>
						Los próximos de {data.rememberLabel} se completan así.
					</Field.Description>
				</Field.Content>
			</Field.Field>
		{/if}

		{#if formError}<p class="error" role="alert">{formError}</p>{/if}

		<Button type="submit" class="w-full" disabled={submitting}>Aprobar</Button>
	</form>

	<ConfirmDialog
		triggerLabel="Descartar"
		triggerClass="w-full"
		title="¿Descartar movimiento?"
		confirmLabel="Descartar"
		action="?/reject"
	>
		No se importa a tus movimientos y no vuelve a aparecer.
	</ConfirmDialog>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.data {
		margin: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-4);
	}

	dt {
		color: var(--text-muted);
	}

	dd {
		margin: 0;
		min-width: 0;
		text-align: right;
		overflow-wrap: anywhere;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.form.submitting > :global(*) {
		opacity: 0.55;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
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

	.error.pad {
		padding: 0 var(--space-4) var(--space-3);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
