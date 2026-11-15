<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { submitAction } from '$lib/autosave';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Money from '$lib/components/Money.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
	import type { PageData } from './$types';

	/**
	 * Reviews one pending Mercado Pago item. `drawer` lives over the inbox (shallow route): it posts to
	 * the page's own actions and reports the outcome through `ondone`. `page` is /imports/<id>, where
	 * the actions redirect back to the inbox with `?done=`.
	 */
	let {
		data,
		variant,
		form = null,
		ondone
	}: {
		data: PageData;
		variant: 'page' | 'drawer';
		/** Page: the failed action's result (values and errors). */
		form?: { values?: Record<string, string>; errors?: Record<string, string | undefined> } | null;
		/** Drawer: the item was approved, discarded or was already reviewed. */
		ondone?: (done: 'approved' | 'rejected' | 'stale') => void;
	} = $props();

	const drawer = $derived(variant === 'drawer');
	const item = $derived(data.item);
	const path = $derived(resolve(`/imports/${item.id}`));

	// Errors of the drawer's own post; the page shows the server-rendered ones instead.
	let posted = $state<Record<string, string | undefined>>({});
	const errors = $derived({ ...(form?.errors ?? {}), ...posted });
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
	let recurringId = $state(initial.recurringId ?? '');
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

	const doneOf = (location: string) => {
		const done = new URL(location, 'http://x').searchParams.get('done');
		return done === 'rejected' || done === 'stale' ? done : 'approved';
	};

	async function discard() {
		const r = await submitAction(`${path}?/reject`, {});
		if (r.type !== 'redirect') {
			toast.error('No se pudo descartar.');
			return;
		}
		ondone?.(doneOf(r.location));
	}
</script>

<div class="review" class:drawer>
	<section class="summary" aria-label="Movimiento a revisar">
		<p class="top">
			<span class="amount">
				<Money
					cents={item.amount}
					currency={item.currency}
					tone="flow"
					direction={item.isCredit ? 'income' : 'outcome'}
				/>
			</span>
			<span class="date">{item.dateLabel}</span>
		</p>
		<p class="original">{item.rawDescription}</p>
	</section>

	{#if data.unknown}
		<p class="hint">No sabemos qué es: elegí el tipo.</p>
	{/if}

	<form
		id="import-form"
		method="POST"
		action={drawer ? `${path}?/approve` : '?/approve'}
		class="form"
		class:submitting
		novalidate
		use:enhance={() => {
			submitting = true;
			return async (input) => {
				const { result, update } = input;
				if (drawer && result.type === 'redirect') {
					// refreshAll keeps the drawer's shallow-route state (invalidateAll would reset it).
					await refreshAll();
					ondone?.(doneOf(result.location));
				} else if (drawer && result.type === 'failure') {
					posted = ((result.data as { errors?: Record<string, string> })?.errors ?? {}) as Record<
						string,
						string | undefined
					>;
				} else if (drawer) {
					toast.error('No se pudo aprobar.');
				} else {
					await update();
				}
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
						name="counterAccountId"
						legend={item.isCredit ? 'Origen' : 'Destino'}
						title={item.isCredit ? 'Elegí la cuenta de origen' : 'Elegí la cuenta de destino'}
						items={data.accounts}
						bind:value={counterId}
						placeholder="Elegir"
						nested={drawer}
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
						name="categoryId"
						legend="Categoría"
						title="Elegí la categoría"
						items={pickableCategories}
						bind:value={categoryId}
						placeholder="Elegir"
						nested={drawer}
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
				{#if data.rules.length}
					<li class:bad={errors.recurringId}>
						<OptionPicker
							name="recurringId"
							legend={item.isCredit ? 'Es el ingreso fijo' : 'Es el pago fijo'}
							title={item.isCredit ? 'Es el ingreso fijo' : 'Es el pago fijo'}
							items={[{ id: '', name: 'Ninguno', icon: 'categories', color: null }, ...data.rules]}
							bind:value={recurringId}
							placeholder="Ninguno"
							nested={drawer}
							error={errors.recurringId}
							errorId="rule-error"
						>
							{#snippet empty()}<p class="hint pad">Todavía no hay opciones.</p>{/snippet}
						</OptionPicker>
					</li>
				{/if}
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
	</form>

	<div class="actions">
		{#if drawer}
			<AlertDialog.Root>
				<AlertDialog.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" class="w-full">Descartar</Button>
					{/snippet}
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>¿Descartar movimiento?</AlertDialog.Title>
						<AlertDialog.Description>
							No se importa a tus movimientos y no vuelve a aparecer.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel type="button" class="w-full">Cancelar</AlertDialog.Cancel>
						<AlertDialog.Action type="button" variant="destructive" class="w-full" onclick={discard}
							>Descartar</AlertDialog.Action
						>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>
		{:else}
			<ConfirmDialog
				triggerLabel="Descartar"
				triggerClass="w-full"
				title="¿Descartar movimiento?"
				confirmLabel="Descartar"
				action="?/reject"
			>
				No se importa a tus movimientos y no vuelve a aparecer.
			</ConfirmDialog>
		{/if}
		<Button
			type="submit"
			form="import-form"
			class="w-full"
			disabled={submitting || !description.trim()}>Aprobar</Button
		>
	</div>
</div>

<style>
	.review {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.summary {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-3) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
		margin: 0;
	}

	.amount {
		font-family: var(--font-display);
		font-size: var(--font-size-lg);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.date {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		white-space: nowrap;
	}

	.original {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
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

	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.hint {
		margin: 0;
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
