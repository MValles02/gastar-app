<script lang="ts">
	import { untrack, type ComponentProps } from 'svelte';
	import { resolve } from '$app/paths';
	import AmountInput from '#lib/components/AmountInput.svelte';
	import DayOfMonthPicker from '#lib/components/pickers/DayOfMonthPicker.svelte';
	import EntryFields from '#lib/components/EntryFields.svelte';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import { formScreen } from '#lib/components/forms/form-enhance.ts';
	import OptionPicker from '#lib/components/pickers/OptionPicker.svelte';
	import Segmented from '#lib/components/base/Segmented.svelte';
	import { isPositiveAmount, toCurrency } from '#lib/money.ts';
	import { categoriesFor } from '#lib/movement.ts';

	type Picker = ComponentProps<typeof OptionPicker>['items'][number];
	type Fields = 'type' | 'description' | 'amount' | 'accountId' | 'categoryId' | 'dayOfMonth';
	type Errors = Partial<Record<Fields, string>>;

	let {
		initial,
		errors = {},
		accounts,
		categories,
		action = '',
		type: initialType
	}: {
		initial: Record<Fields, string>;
		errors?: Errors;
		accounts: Picker[];
		categories: (Picker & { kind: string | null })[];
		/** Page: the form's action. Drawer: the query (e.g. `?wizard=2`) added to /plan/recurring/new. */
		action?: string;
		/** `income` or `outcome`: where the Pago / Ingreso switch starts. */
		type: string;
	} = $props();

	// In a FormScreen drawer: stacked pickers, Guardar waits for amount and description, posts to
	// /plan/recurring/new and reports the result instead of navigating.
	const drawer = formScreen().variant === 'drawer';
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

	// Errors from the drawer's post; the page shows the server-rendered `errors` instead.
	let fieldErrors = $state<Errors>({});
	const shown = $derived({ ...errors, ...fieldErrors });

	// The rule's own saved category stays pickable.
	const savedCategoryId = untrack(() => initial.categoryId);
	const pickableCategories = $derived(categoriesFor(categories, type, savedCategoryId));
	$effect(() => {
		if (categoryId && !pickableCategories.some((c) => c.id === categoryId)) categoryId = '';
	});

	const currency = $derived.by(() => {
		const meta = accounts.find((a) => a.id === accountId)?.meta;
		return meta === undefined ? undefined : toCurrency(meta);
	});
</script>

{#snippet account()}
	<li class:bad={shown.accountId}>
		<OptionPicker
			name="accountId"
			legend="Cuenta"
			title="Elegí la cuenta"
			items={accounts}
			bind:value={accountId}
			placeholder="Elegir"
			error={shown.accountId}
			errorId="raccount-error"
		>
			{#snippet empty()}
				<p class="hint pad">
					Todavía no tenés cuentas. <a href={resolve('accounts/new')}>Crear cuenta</a>
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
			placeholder="Elegir"
			error={shown.categoryId}
			errorId="rcategory-error"
		>
			{#snippet empty()}
				<p class="hint pad">
					Todavía no tenés categorías. <a href={resolve('categories/new')}>Crear categoría</a>
				</p>
			{/snippet}
		</OptionPicker>
	</li>
{/snippet}

{#snippet when()}
	<li class:bad={shown.dayOfMonth}>
		<DayOfMonthPicker bind:value={day} error={shown.dayOfMonth} />
	</li>
{/snippet}

<FormShell
	action={drawer ? resolve('plan/recurring/new') + action : action}
	{errors}
	onfailure={(data: { errors?: Errors }) => (fieldErrors = data.errors ?? {})}
	canSave={isPositiveAmount(amount) && description.trim() !== ''}
	scroll="drawer"
	style="--form-gap: var(--space-5)"
>
	<div class="field">
		<span id="rtype-label" class="visually-hidden">Tipo</span>
		<Segmented name="type" options={typeOptions} bind:value={type} labelledby="rtype-label" />
		{#if shown.type}<p class="error" role="alert">{shown.type}</p>{/if}
	</div>

	<AmountInput
		bind:value={amount}
		{currency}
		error={shown.amount}
		id="ramount"
		autofocus={drawer}
		color={drawer ? (type === 'income' ? 'var(--positive)' : 'var(--negative)') : undefined}
	/>

	<EntryFields
		bind:description
		descriptionId="rdescription"
		descriptionError={shown.description}
		placeholder={drawer ? (type === 'income' ? 'Ej.: Sueldo' : 'Ej.: Alquiler') : undefined}
		outlineErrors={drawer}
		{account}
		{category}
		{when}
	/>
</FormShell>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
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
