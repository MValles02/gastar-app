<script lang="ts">
	import { onMount, tick, untrack, type ComponentProps } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { followRedirect } from '#lib/nav-stack.svelte.ts';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import AmountHero from '#lib/components/AmountHero.svelte';
	import DayOfMonthPicker from '#lib/components/DayOfMonthPicker.svelte';
	import EntryFields from '#lib/components/EntryFields.svelte';
	import FormActions from '#lib/components/FormActions.svelte';
	import OptionPicker from '#lib/components/OptionPicker.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import { DESCRIPTION_MAX_LENGTH } from '#lib/fields.ts';
	import { isPositiveAmount } from '#lib/money.ts';

	type Picker = ComponentProps<typeof OptionPicker>['items'][number];
	type Fields = 'type' | 'description' | 'amount' | 'accountId' | 'categoryId' | 'dayOfMonth';

	let {
		initial,
		errors = {},
		accounts,
		categories,
		action = '',
		submitLabel,
		cancelHref = '/plan',
		type: initialType,
		variant = 'page',
		onsaved,
		onclose

		/** Page: the form's action. Drawer: the query (e.g. `?wizard=2`) added to /plan/recurring/new. */
		/** `income` or `outcome`: where the Pago / Ingreso switch starts. */
		/**
		 * `drawer`: the new-rule drawer (stacked pickers, Guardar waits for amount and description, posts to
		 * /plan/recurring/new and reports the result instead of navigating). `page`: a full page.
		 */
		/** Drawer: the save succeeded. */
		/** Drawer: Cancelar. */
	}: {
		initial: Record<Fields, string>;
		errors?: Partial<Record<Fields, string>>;
		accounts: Picker[];
		categories: (Picker & { kind: string | null })[];
		action?: string;
		submitLabel: string;
		cancelHref?: string;
		type: string;
		variant?: 'page' | 'drawer';
		onsaved?: () => void;
		onclose?: () => void;
	} = $props();

	const drawer = $derived(variant === 'drawer');
	const typeOptions = [
		{ value: 'outcome', label: 'Pago' },
		{ value: 'income', label: 'Ingreso' }
	];

	let type = $state(untrack(() => initialType));
	let accountId = $state(untrack(() => initial.accountId));
	let amount = $state(untrack(() => initial.amount));
	let description = $state(untrack(() => initial.description));
	let day = $state(untrack(() => initial.dayOfMonth));
	let categoryId = $state(untrack(() => initial.categoryId));
	let mounted = $state(false);
	let submitting = $state(false);
	onMount(() => (mounted = true));

	// Errors from the drawer's post; the page shows the server-rendered `errors` instead.
	let fieldErrors = $state<Partial<Record<Fields, string>>>({});
	const shown = $derived({ ...errors, ...fieldErrors });
	const canSave = $derived(isPositiveAmount(amount) && description.trim() !== '');

	// The rule's own saved category stays pickable.
	const pickableCategories = $derived(
		categories.filter(
			(c) => c.kind === null || c.kind === type || c.id === untrack(() => initial.categoryId)
		)
	);
	$effect(() => {
		if (categoryId && !pickableCategories.some((c) => c.id === categoryId)) categoryId = '';
	});

	const currency = $derived.by(() => {
		const meta = accounts.find((a) => a.id === accountId)?.meta;
		return meta === 'USD' ? 'USD' : meta === 'ARS' ? 'ARS' : undefined;
	});

	const focusFirstError = () =>
		tick().then(() => {
			document
				.querySelector<HTMLElement>(
					'form [aria-invalid="true"], form button[aria-describedby$="-error"]'
				)
				?.focus();
		});

	// After a failed submit, move focus to the first field marked invalid (inputs or picker triggers).
	$effect(() => {
		if (Object.values(errors).some(Boolean)) focusFirstError();
	});
</script>

<form
	method="POST"
	action={drawer ? resolve('plan/recurring/new') + action : action}
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
	{#snippet fields()}
		<div class="field">
			<span id="rtype-label" class="visually-hidden">Tipo</span>
			<SegmentedControl
				name="type"
				options={typeOptions}
				bind:value={type}
				labelledby="rtype-label"
			/>
			{#if shown.type}<p class="error" role="alert">{shown.type}</p>{/if}
		</div>

		<AmountHero
			bind:value={amount}
			{currency}
			error={shown.amount}
			id="ramount"
			autofocus={drawer}
			color={drawer ? (type === 'income' ? 'var(--positive)' : 'var(--negative)') : undefined}
		/>

		{#snippet account()}
			<li class:bad={shown.accountId}>
				<OptionPicker
					name="accountId"
					legend="Cuenta"
					title="Elegí la cuenta"
					items={accounts}
					bind:value={accountId}
					nested={drawer}
					placeholder="Elegir"
					error={shown.accountId}
					errorId="raccount-error"
				>
					{#snippet empty()}
						<p class="hint pad">
							Todavía no tenés cuentas.
							<a href={resolve('accounts/new')}>Crear cuenta</a>
						</p>
					{/snippet}
				</OptionPicker>
			</li>
		{/snippet}

		{#snippet category()}
			<li class:bad={shown.categoryId}>
				<OptionPicker
					name="categoryId"
					legend="Categoría"
					title="Elegí la categoría"
					items={pickableCategories}
					bind:value={categoryId}
					nested={drawer}
					placeholder="Elegir"
					error={shown.categoryId}
					errorId="rcategory-error"
				>
					{#snippet empty()}
						<p class="hint pad">
							Todavía no tenés categorías.
							<a href={resolve('categories/new')}>Crear categoría</a>
						</p>
					{/snippet}
				</OptionPicker>
			</li>
		{/snippet}

		{#snippet when()}
			<li class:bad={shown.dayOfMonth}>
				<DayOfMonthPicker
					bind:value={day}
					nested={drawer}
					error={shown.dayOfMonth}
					errorId="rday-error"
				/>
			</li>
		{/snippet}

		{#if drawer}
			<div class="text-field">
				<label for="rdescription">Descripción</label>
				<input
					id="rdescription"
					name="description"
					type="text"
					autocomplete="off"
					maxlength={DESCRIPTION_MAX_LENGTH}
					required
					placeholder={type === 'income' ? 'Ej.: Sueldo' : 'Ej.: Alquiler'}
					bind:value={description}
					aria-invalid={shown.description ? 'true' : undefined}
					aria-describedby={shown.description ? 'rdescription-error' : undefined}
				/>
				{#if shown.description}
					<p class="error" id="rdescription-error" role="alert">{shown.description}</p>
				{/if}
			</div>
			<ul class="card">
				{@render account()}
				{@render category()}
				{@render when()}
			</ul>
		{:else}
			<EntryFields
				bind:description
				descriptionId="rdescription"
				descriptionError={shown.description}
				{account}
				{category}
				{when}
			/>
		{/if}
	{/snippet}

	{#if drawer}
		<div class="scroll">{@render fields()}</div>
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
				aria-busy={submitting ? 'true' : undefined}>{submitLabel}</Button
			>
		</div>
	{:else}
		{@render fields()}

		<FormActions {cancelHref} {submitLabel} {submitting} />
	{/if}
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}

	.form.drawer {
		flex: 1;
		min-height: 0;
		gap: 0;
		padding-top: 0;
	}

	.scroll {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-height: 0;
		overflow-y: auto;
		padding: var(--space-1) var(--space-4) var(--space-4);
	}

	.form.submitting .scroll {
		opacity: 0.55;
	}

	.actions {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--popover);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.text-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.text-field label {
		color: var(--text-muted);
		font-size: 13px;
		font-weight: 500;
	}

	.text-field input {
		width: 100%;
		height: 50px;
		padding: 0 var(--space-4);
		border: 1px solid var(--border);
		border-radius: 12px;
		background: transparent;
		color: var(--text);
		font-size: 16px;
	}

	.text-field input[aria-invalid='true'] {
		border-color: var(--negative);
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

	.card > :global(li.bad) {
		box-shadow: inset 0 0 0 1.5px var(--negative);
	}

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.hint.pad {
		padding: var(--space-3) var(--space-4);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
