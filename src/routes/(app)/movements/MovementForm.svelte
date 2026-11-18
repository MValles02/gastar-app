<script lang="ts">
	import { MIN_DAY } from '#lib/dates.ts';
	import type { Currency } from '#lib/money.ts';
	import { categoriesFor, MOVEMENT_MESSAGES, movementNeeds } from '#lib/movement.ts';
	import { savedMovement } from '#lib/toast-flags.ts';
	import { untrack, type ComponentProps } from 'svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import { resolve } from '$app/paths';
	import AmountInput from '#lib/components/AmountInput.svelte';
	import CategoryCreateDrawer from '#lib/components/categories/CategoryCreateDrawer.svelte';
	import type { CreatedCategory } from '#lib/components/categories/CategoryForm.svelte';
	import EntryFields from '#lib/components/EntryFields.svelte';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import CrossCurrencyRows from '#lib/components/movements/CrossCurrencyRows.svelte';
	import DatePicker from '#lib/components/pickers/DatePicker.svelte';
	import OptionPicker from '#lib/components/pickers/OptionPicker.svelte';
	import SwitchRow from '#lib/components/SwitchRow.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import TextRow from '#lib/components/TextRow.svelte';
	import {
		convertInput,
		CURRENCY_LABEL,
		isPositiveAmount,
		isValidRate,
		parseAmount
	} from '#lib/money.ts';

	type Picker = ComponentProps<typeof OptionPicker>['items'][number];
	type Fields =
		| 'type'
		| 'amount'
		| 'description'
		| 'accountId'
		| 'destinationAccountId'
		| 'exchangeRate'
		| 'categoryId'
		| 'occurredAt';
	type Errors = Partial<Record<Fields, string>>;

	let {
		initial,
		errors = {},
		accounts,
		categories,
		submitLabel,
		cancelHref,
		returnTo,
		repeatable = false,
		repeatChecked = false,
		variant = 'page',
		onsaved,
		onclose
	}: {
		initial: Record<Fields, string>;
		errors?: Errors;
		accounts: (Picker & { currency: Currency; balance?: number })[];
		categories: (Picker & { kind: string | null })[];
		submitLabel: string;
		cancelHref: string;
		/** Where saving returns to (validated by the action); none keeps the user on the form. */
		returnTo?: string | null;
		/** Offer "Repetir todos los meses" (new incomes and outcomes only). */
		repeatable?: boolean;
		/** Initial state of the "Repetir todos los meses" switch (kept when the form is shown again with errors). */
		repeatChecked?: boolean;
		/**
		 * `drawer`: the new-movement drawer (stacked pickers, per-row validation, actions pinned below,
		 * posts to /movements/new and reports the result instead of navigating). `page`: a full page.
		 */
		variant?: 'page' | 'drawer';
		/** Drawer: the save succeeded; ids come from the action's redirect flags. */
		onsaved?: (saved: { id: string; ruleId: string | null }) => void;
		/** Drawer: Cancelar. */
		onclose?: () => void;
	} = $props();

	const drawer = $derived(variant === 'drawer');

	const typeOptions = [
		{ value: 'outcome', label: 'Gasto' },
		{ value: 'income', label: 'Ingreso' },
		{ value: 'transfer', label: 'Transf.' }
	];

	const AMOUNT_COLOR = {
		outcome: 'var(--negative)',
		income: 'var(--positive)',
		transfer: 'var(--transfer)'
	} as const;

	const DESCRIPTION_PLACEHOLDER = {
		outcome: 'Ej.: Supermercado',
		income: 'Ej.: Sueldo',
		transfer: 'Ej.: Carga Mercado Pago'
	} as const;

	let mounted = $state(false);

	let type = $state(untrack(() => initial.type || 'outcome'));
	let accountId = $state(untrack(() => initial.accountId));
	let destinationId = $state(untrack(() => initial.destinationAccountId));
	let categoryId = $state(untrack(() => initial.categoryId));
	let occurredAt = $state(untrack(() => initial.occurredAt));
	let amount = $state(untrack(() => initial.amount));
	let description = $state(untrack(() => initial.description));
	let rate = $state(untrack(() => initial.exchangeRate));
	const savedCategoryId = untrack(() => initial.categoryId);

	// Errors found in the drawer (before posting, or in the action's answer); the page shows the
	// server-rendered `errors` instead.
	let fieldErrors = $state<Errors>({});
	const shown = $derived({ ...errors, ...fieldErrors });
	// A row's error goes away as soon as that row gets a different value.
	const values = $derived<Record<Fields, string>>({
		type,
		amount,
		description,
		accountId,
		destinationAccountId: destinationId,
		exchangeRate: rate,
		categoryId,
		occurredAt
	});
	let seen = untrack(() => ({ ...values }));
	$effect(() => {
		const now = { ...values };
		untrack(() => {
			for (const k of Object.keys(now) as Fields[]) if (now[k] !== seen[k]) delete fieldErrors[k];
			seen = now;
		});
	});

	// Categories created from the drawer, listed after the server's (ranked) ones.
	let created = $state<(Picker & { kind: string | null })[]>([]);
	const allCategories = $derived([...categories, ...created]);
	let createOpen = $state(false);
	function categoryCreated(c: CreatedCategory) {
		created.push({
			id: c.id,
			name: c.name,
			icon: c.icon,
			color: c.color,
			kind: c.kind,
			archived: false
		});
		categoryId = c.id;
	}

	const isTransfer = $derived(type === 'transfer');
	const showTransfer = $derived(!mounted || isTransfer);
	const showCategory = $derived(!mounted || !isTransfer);

	$effect(() => {
		if (destinationId && destinationId === accountId) destinationId = '';
	});

	// Without JS the type changes without a reload, so every category is listed (the server validates).
	// A category already saved on this movement or rule stays pickable.
	const pickableCategories = $derived(
		!mounted || isTransfer ? allCategories : categoriesFor(allCategories, type, savedCategoryId)
	);
	$effect(() => {
		if (categoryId && !pickableCategories.some((c) => c.id === categoryId)) categoryId = '';
	});

	// The drawer's account rows show the currency written out under the name.
	const accountItems = $derived(
		accounts.map((a) => (a.balance === undefined ? a : { ...a, meta: CURRENCY_LABEL[a.currency] }))
	);

	const originCurrency = $derived(accounts.find((a) => a.id === accountId)?.currency);
	const destCurrency = $derived(accounts.find((a) => a.id === destinationId)?.currency);
	const needs = $derived(
		movementNeeds(type, { origin: originCurrency, destination: destCurrency })
	);

	const converted = $derived(
		needs.rate && originCurrency && destCurrency
			? convertInput(amount, rate, originCurrency, destCurrency)
			: null
	);

	// Drawer: Guardar waits for the two fields every movement needs; the rest is checked on press.
	const canSave = $derived(isPositiveAmount(amount) && description.trim() !== '');

	/** Drawer: posts only once every row has a value (same fields and messages as the server). */
	function validate() {
		const e: Errors = {};
		if (!accountId) e.accountId = MOVEMENT_MESSAGES.account;
		if (needs.destination) {
			if (!destinationId) e.destinationAccountId = MOVEMENT_MESSAGES.destination;
			if (needs.rate && !isValidRate(parseAmount(rate))) e.exchangeRate = MOVEMENT_MESSAGES.rate;
		} else if (needs.category && !categoryId) e.categoryId = MOVEMENT_MESSAGES.category;
		if (Object.keys(e).length === 0) return true;
		fieldErrors = e;
		return false;
	}

	function saved(location: string) {
		const sp = new URL(location, window.location.href).searchParams;
		const back = savedMovement(sp, 'movementSaved');
		onsaved?.({ id: back.id ?? savedMovement(sp, 'saved').id ?? '', ruleId: back.ruleId });
	}
</script>

{#snippet repeat()}
	<li>
		<SwitchRow id="repeat" name="repeat" label="Repetir todos los meses" checked={repeatChecked} />
	</li>
{/snippet}

{#snippet newCategoryRow(close: () => void)}
	<button
		type="button"
		class="new-category"
		onclick={() => {
			close();
			createOpen = true;
		}}><Plus size={18} strokeWidth={2} aria-hidden="true" />Nueva categoría</button
	>
{/snippet}

<FormShell
	action={drawer ? resolve('movements/new') : ''}
	{variant}
	{errors}
	validate={drawer ? validate : undefined}
	onfailure={(data: { errors?: Errors }) => (fieldErrors = data.errors ?? {})}
	onsaved={drawer ? saved : undefined}
	{onclose}
	errorToast="No se pudo guardar el movimiento."
	{cancelHref}
	{submitLabel}
	{canSave}
	scroll="drawer"
	style="--form-gap: var(--space-5)"
	bind:mounted
>
	<div class="fields">
		{#if returnTo}<input type="hidden" name="returnTo" value={returnTo} />{/if}

		<div class="field" class:centered={drawer}>
			<span id="type-label" class="visually-hidden">Tipo</span>
			<SegmentedControl
				name="type"
				options={typeOptions}
				bind:value={type}
				labelledby="type-label"
			/>
			{#if shown.type}<p class="error" role="alert">{shown.type}</p>{/if}
		</div>

		<AmountInput
			bind:value={amount}
			currency={originCurrency}
			error={shown.amount}
			autofocus
			color={drawer ? AMOUNT_COLOR[type as keyof typeof AMOUNT_COLOR] : undefined}
		/>

		<EntryFields
			bind:description
			descriptionId="description"
			descriptionError={shown.description}
			placeholder={DESCRIPTION_PLACEHOLDER[type as keyof typeof DESCRIPTION_PLACEHOLDER]}
			outlineErrors={drawer}
			extra={repeatable && showCategory ? repeat : undefined}
		>
			{#snippet account()}
				<li class:bad={shown.accountId}>
					<OptionPicker
						name="accountId"
						legend={isTransfer ? 'Desde' : 'Cuenta'}
						title={isTransfer ? 'Desde' : 'Cuenta'}
						items={accountItems}
						bind:value={accountId}
						nested={drawer}
						placeholder="Elegir"
						error={shown.accountId}
						errorId="account-error"
					>
						{#snippet empty()}<p class="hint pad">Todavía no tenés cuentas.</p>{/snippet}
					</OptionPicker>
				</li>

				{#if showTransfer}
					<li class:bad={shown.destinationAccountId}>
						{#if !mounted}<p class="hint pad">Solo para transferencias</p>{/if}
						<OptionPicker
							name="destinationAccountId"
							legend="Hacia"
							title="Hacia"
							items={accountItems}
							bind:value={destinationId}
							excludeId={mounted ? accountId : undefined}
							nested={drawer}
							placeholder="Elegir"
							error={shown.destinationAccountId}
							errorId="destination-error"
						>
							{#snippet empty()}<p class="hint pad">
									Necesitás otra cuenta para transferir.
								</p>{/snippet}
						</OptionPicker>
					</li>
				{/if}

				{#if !mounted}
					<li class:bad={shown.exchangeRate}>
						<p class="hint pad">Solo para transferencias entre monedas distintas</p>
						<TextRow
							id="exchangeRate"
							name="exchangeRate"
							label="Cotización"
							bind:value={rate}
							placeholder="0"
							inputmode="numeric"
							prefix="1 USD = $"
							amount
							error={shown.exchangeRate}
							errorId="rate-error"
						/>
					</li>
				{:else if needs.rate}
					<CrossCurrencyRows
						{rate}
						rateCents={parseAmount(rate)}
						onsave={async (next) => {
							rate = next;
							return null;
						}}
						required
						error={shown.exchangeRate}
						errorId="rate-error"
						converted={converted !== null && destCurrency
							? { cents: converted, currency: destCurrency }
							: null}
					>
						{#snippet hidden()}<input type="hidden" name="exchangeRate" value={rate} />{/snippet}
					</CrossCurrencyRows>
				{/if}
			{/snippet}

			{#snippet category()}
				{#if showCategory}
					<li class:bad={shown.categoryId}>
						{#if !mounted}<p class="hint pad">Solo para ingresos y gastos</p>{/if}
						<OptionPicker
							name="categoryId"
							legend="Categoría"
							title="Categoría"
							items={pickableCategories}
							bind:value={categoryId}
							nested={drawer}
							extra={drawer ? newCategoryRow : undefined}
							placeholder="Elegir"
							error={shown.categoryId}
							errorId="category-error"
						>
							{#snippet empty()}
								{#if drawer}
									<button type="button" class="new-category" onclick={() => (createOpen = true)}
										><Plus size={18} strokeWidth={2} aria-hidden="true" />Nueva categoría</button
									>
								{:else}
									<p class="hint pad">
										Todavía no tenés categorías.
										<a href={resolve('categories/new')}>Crear categoría</a>
									</p>
								{/if}
							{/snippet}
						</OptionPicker>
					</li>
				{/if}
			{/snippet}

			{#snippet when()}
				<li class:bad={shown.occurredAt}>
					<DatePicker
						presets
						name="occurredAt"
						label="Fecha"
						min={MIN_DAY}
						bind:value={occurredAt}
						nested={drawer}
						error={shown.occurredAt}
						errorId="date-error"
					/>
				</li>
			{/snippet}
		</EntryFields>
	</div>
</FormShell>

{#if drawer}
	<CategoryCreateDrawer
		bind:open={createOpen}
		defaultKind={type === 'income' ? 'income' : 'outcome'}
		oncreated={categoryCreated}
	/>
{/if}

<style>
	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	/* The page dims the fields while saving (the drawer dims its scroll area). */
	:global(form.submitting) > .fields {
		opacity: 0.55;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.centered {
		align-items: stretch;
	}

	/* Below the category card: a left-aligned, bold link-coloured row with a plus. */
	.new-category {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 10px;
		width: 100%;
		min-height: 52px;
		margin-top: var(--space-1);
		padding: 0 var(--space-4);
		border: 0;
		background: transparent;
		text-align: left;
		font-size: var(--font-size-base);
		font-weight: 600;
		color: var(--link);
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
