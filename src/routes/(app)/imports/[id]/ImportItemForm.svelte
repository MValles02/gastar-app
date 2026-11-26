<script lang="ts">
	import { untrack } from 'svelte';
	import type { ActionResult } from '$app/forms';
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import { toast } from 'svelte-sonner';
	import { goto, refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import DetailCard from '#lib/components/DetailCard.svelte';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import { formScreen } from '#lib/components/forms/form-enhance.ts';
	import Money from '#lib/components/Money.svelte';
	import OptionPicker from '#lib/components/pickers/OptionPicker.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import TextRow from '#lib/components/TextRow.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { DESCRIPTION_MAX_LENGTH } from '#lib/fields.ts';
	import { categoriesFor } from '#lib/movement.ts';
	import { importDoneOf, type ImportDone } from '#lib/toast-flags.ts';
	import type { PageData } from './$types';

	/**
	 * Reviews one pending Mercado Pago item. As a drawer over the inbox (shallow route) it posts to the
	 * page's own actions and reports the outcome through `ondone`; as the /imports/<id> page the
	 * actions redirect back to the inbox with `?done=`.
	 */
	let {
		data,
		form = null,
		ondone
	}: {
		data: PageData;
		/** Page: the failed action's result (values and errors). */
		form?: { values?: Record<string, string>; errors?: Record<string, string | undefined> } | null;
		/** Drawer: the item was approved, discarded or was already reviewed. */
		ondone?: (done: ImportDone) => void;
	} = $props();

	const drawer = formScreen().variant === 'drawer';
	const item = $derived(data.item);
	const path = $derived(resolve(`imports/${item.id}`));

	// Errors of the drawer's own post; the page shows the server-rendered ones instead.
	let posted = $state<Record<string, string | undefined>>({});
	const errors = $derived({ ...(form?.errors ?? {}), ...posted });
	const formError = $derived(errors.form ?? errors.accountId ?? errors.destinationAccountId);

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

	const mounted = hydrated();
	let submitting = $state(false);

	const isTransfer = $derived(type === 'transfer');
	const showTransfer = $derived(!mounted.current || isTransfer);
	const showCategory = $derived(!mounted.current || !isTransfer);

	// Without JS the type changes without a reload, so every category is listed (the server validates).
	// An import item has no saved category to keep pickable.
	const pickableCategories = $derived(
		!mounted.current || isTransfer ? data.categories : categoriesFor(data.categories, type, null)
	);
	$effect(() => {
		if (categoryId && !pickableCategories.some((c) => c.id === categoryId)) categoryId = '';
	});

	async function approved(location: string) {
		if (!drawer) {
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- server-validated same-origin redirect location
			await goto(location, { invalidateAll: true });
			return;
		}
		// refreshAll keeps the drawer's shallow-route state (invalidateAll would reset it).
		await refreshAll();
		ondone?.(importDoneOf(location));
	}

	/** Drawer: the discard's answer (the page follows its redirect). */
	function discarded(_type: string, r: ActionResult) {
		if (r.type !== 'redirect') return void toast.error('No se pudo descartar.');
		ondone?.(importDoneOf(r.location));
	}
</script>

<div class="review" class:drawer>
	<Card.Root role="region" aria-label="Movimiento a revisar" class="gap-1 px-4 py-3">
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
		{#if item.cuotas}
			<p class="cuotas">
				{item.cuotas.n} cuotas de <Money cents={item.cuotas.amount} currency={item.currency} />
			</p>
		{/if}
		<p class="original">{item.rawDescription}</p>
	</Card.Root>

	{#if data.unknown}
		<p class="hint">No sabemos qué es: elegí el tipo.</p>
	{/if}

	<FormShell
		id="import-form"
		action={drawer ? `${path}?/approve` : '?/approve'}
		bar={false}
		errors={form?.errors}
		onfailure={(d: { errors?: Record<string, string | undefined> }) => (posted = d.errors ?? {})}
		onsaved={approved}
		errorToast="No se pudo aprobar."
		bind:submitting
	>
		{#if item.cuotas}
			<input type="hidden" name="type" value="outcome" />
		{:else}
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
		{/if}

		<DetailCard>
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
					{#if !mounted.current}<p class="hint pad">Solo para transferencias</p>{/if}
					<OptionPicker
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
								<a href={resolve('accounts/new')}>Crear cuenta</a>
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
					{#if !mounted.current}<p class="hint pad">Solo para ingresos y gastos</p>{/if}
					<OptionPicker
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
								<a href={resolve('categories/new')}>Crear categoría</a>
							</p>
							{#if errors.categoryId}<p class="error pad" role="alert">{errors.categoryId}</p>{/if}
						{/snippet}
					</OptionPicker>
				</li>
				{#if data.rules.length && !item.cuotas}
					<li class:bad={errors.recurringId}>
						<OptionPicker
							name="recurringId"
							legend={item.isCredit ? 'Es el ingreso fijo' : 'Es el pago fijo'}
							title={item.isCredit ? 'Es el ingreso fijo' : 'Es el pago fijo'}
							items={[{ id: '', name: 'Ninguno', icon: 'categories', color: null }, ...data.rules]}
							bind:value={recurringId}
							placeholder="Ninguno"
							error={errors.recurringId}
							errorId="rule-error"
						>
							{#snippet empty()}<p class="hint pad">Todavía no hay opciones.</p>{/snippet}
						</OptionPicker>
					</li>
				{/if}
			{/if}
		</DetailCard>

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
	</FormShell>

	<div class="actions">
		<ConfirmDialog
			triggerLabel="Descartar"
			triggerClass="w-full"
			title="¿Descartar movimiento?"
			confirmLabel="Descartar"
			action={drawer ? `${path}?/reject` : '?/reject'}
			closeOnFailure={drawer}
			ondone={drawer ? discarded : undefined}
		>
			No se importa a tus movimientos y no vuelve a aparecer.
		</ConfirmDialog>
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

	.cuotas {
		margin: 0;
		font-size: var(--font-size-sm);
	}

	.original {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.review :global(#import-form.submitting > *) {
		opacity: 0.55;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
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
