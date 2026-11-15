<script lang="ts">
	import { MIN_DAY } from '#lib/dates.ts';
	import type { Currency } from '#lib/money.ts';
	import { MOVEMENT_MESSAGES } from '#lib/movement.ts';
	import { onMount, tick, untrack, type ComponentProps } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { followRedirect } from '#lib/nav-stack.svelte.ts';
	import { resolve } from '$app/paths';
	import AmountHero from '#lib/components/AmountHero.svelte';
	import CategoryCreateDrawer from '../categories/CategoryCreateDrawer.svelte';
	import type { CreatedCategory } from '../categories/CategoryForm.svelte';
	import EntryFields from '#lib/components/EntryFields.svelte';
	import FormActions from '#lib/components/FormActions.svelte';
	import MovementDatePicker from '#lib/components/MovementDatePicker.svelte';
	import OptionPicker from '#lib/components/OptionPicker.svelte';
	import SwitchRow from '#lib/components/SwitchRow.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { convertInput, isPositiveAmount, isValidRate, parseAmount } from '#lib/money.ts';
	import CategoryRow from './CategoryRow.svelte';
	import TransferRows from './TransferRows.svelte';

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

		/** Where saving returns to (validated by the action); none keeps the user on the form. */
		/** Offer "Repetir todos los meses" (new incomes and outcomes only). */
		/** Initial state of the "Repetir todos los meses" switch (kept when the form is shown again with errors). */
		/**
		 * `drawer`: the new-movement drawer (stacked pickers, per-row validation, actions pinned below,
		 * posts to /movements/new and reports the result instead of navigating). `page`: a full page.
		 */
		/** Drawer: the save succeeded; ids come from the action's redirect flags. */
		/** Drawer: Cancelar. */
	}: {
		initial: Record<Fields, string>;
		errors?: Partial<Record<Fields, string>>;
		accounts: (Picker & { currency: Currency; balance?: number })[];
		categories: (Picker & { kind: string | null })[];
		submitLabel: string;
		cancelHref: string;
		returnTo?: string | null;
		repeatable?: boolean;
		repeatChecked?: boolean;
		variant?: 'page' | 'drawer';
		onsaved?: (saved: { id: string; ruleId: string | null }) => void;
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

	let submitting = $state(false);
	let mounted = $state(false);
	onMount(() => (mounted = true));

	let type = $state(untrack(() => initial.type || 'outcome'));
	let accountId = $state(untrack(() => initial.accountId));
	let destinationId = $state(untrack(() => initial.destinationAccountId));
	let categoryId = $state(untrack(() => initial.categoryId));
	let occurredAt = $state(untrack(() => initial.occurredAt));
	let amount = $state(untrack(() => initial.amount));
	let description = $state(untrack(() => initial.description));
	let rate = $state(untrack(() => initial.exchangeRate));

	// Errors found in the drawer (before posting, or in the action's answer); the page shows the
	// server-rendered `errors` instead.
	let fieldErrors = $state<Partial<Record<Fields, string>>>({});
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

	$effect(() => {
		if (destinationId && destinationId === accountId) destinationId = '';
	});

	// Without JS the type changes without a reload, so every category is listed (the server validates).
	// A category already saved on this movement or rule stays pickable.
	const pickableCategories = $derived(
		!mounted || isTransfer
			? allCategories
			: allCategories.filter(
					(c) => c.kind === null || c.kind === type || c.id === untrack(() => initial.categoryId)
				)
	);
	$effect(() => {
		if (categoryId && !pickableCategories.some((c) => c.id === categoryId)) categoryId = '';
	});

	// The drawer's account rows show the currency written out under the name.
	const accountItems = $derived(
		accounts.map((a) =>
			a.balance === undefined ? a : { ...a, meta: a.currency === 'USD' ? 'Dólares' : 'Pesos' }
		)
	);

	const originCurrency = $derived(accounts.find((a) => a.id === accountId)?.currency);
	const destCurrency = $derived(accounts.find((a) => a.id === destinationId)?.currency);
	const crossCurrency = $derived(
		!!originCurrency && !!destCurrency && originCurrency !== destCurrency
	);
	const showRate = $derived(isTransfer && crossCurrency);

	const converted = $derived(
		showRate && originCurrency && destCurrency
			? convertInput(amount, rate, originCurrency, destCurrency)
			: null
	);

	// Drawer: Guardar waits for the two fields every movement needs; the rest is checked on press.
	const canSave = $derived(isPositiveAmount(amount) && description.trim() !== '');

	/** The rows still missing a value (drawer): same fields and messages as the server. */
	function missing() {
		const e: Partial<Record<Fields, string>> = {};
		if (!accountId) e.accountId = MOVEMENT_MESSAGES.account;
		if (isTransfer) {
			if (!destinationId) e.destinationAccountId = MOVEMENT_MESSAGES.destination;
			if (showRate && !isValidRate(parseAmount(rate))) e.exchangeRate = MOVEMENT_MESSAGES.rate;
		} else if (!categoryId) e.categoryId = MOVEMENT_MESSAGES.category;
		return e;
	}
</script>

{#snippet fields()}
	{#if returnTo}<input type="hidden" name="returnTo" value={returnTo} />{/if}

	<div class="field" class:centered={drawer}>
		<span id="type-label" class="visually-hidden">Tipo</span>
		<SegmentedControl name="type" options={typeOptions} bind:value={type} labelledby="type-label" />
		{#if shown.type}<p class="error" role="alert">{shown.type}</p>{/if}
	</div>

	<AmountHero
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

			<TransferRows
				{showTransfer}
				{showRate}
				{mounted}
				{drawer}
				{accountItems}
				{accountId}
				{destCurrency}
				{converted}
				{shown}
				bind:destinationId
				bind:rate
			/>
		{/snippet}

		{#snippet category()}
			<CategoryRow
				{showCategory}
				{mounted}
				{drawer}
				{pickableCategories}
				{shown}
				bind:categoryId
				oncreate={() => (createOpen = true)}
			/>
		{/snippet}

		{#snippet when()}
			<li class:bad={shown.occurredAt}>
				<MovementDatePicker
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
{/snippet}

{#snippet repeat()}
	<li>
		<SwitchRow id="repeat" name="repeat" label="Repetir todos los meses" checked={repeatChecked} />
	</li>
{/snippet}

<form
	method="POST"
	action={drawer ? resolve('movements/new') : undefined}
	class="form"
	class:drawer
	class:submitting
	novalidate
	use:enhance={({ cancel }) => {
		if (drawer) {
			const e = missing();
			if (Object.keys(e).length > 0) {
				cancel();
				fieldErrors = e;
				focusFirstError();
				return;
			}
		}
		submitting = true;
		return async (input) => {
			if (!drawer) {
				await followRedirect(input);
				submitting = false;
				return;
			}
			const { result } = input;
			if (result.type === 'redirect') {
				const flags = new URL(result.location, location.href).searchParams;
				onsaved?.({
					id: flags.get('movementSaved') ?? flags.get('saved') ?? '',
					ruleId: flags.get('rule')
				});
			} else if (result.type === 'failure') {
				fieldErrors = (result.data?.errors ?? {}) as typeof fieldErrors;
				focusFirstError();
			} else toast.error('No se pudo guardar el movimiento.');
			submitting = false;
		};
	}}
>
	{#if drawer}
		<div class="scroll">{@render fields()}</div>
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
				aria-busy={submitting ? 'true' : undefined}>{submitLabel}</Button
			>
		</div>
	{:else}
		{@render fields()}

		<FormActions {cancelHref} {submitLabel} {submitting} />
	{/if}
</form>

{#if drawer}
	<CategoryCreateDrawer
		bind:open={createOpen}
		defaultKind={type === 'income' ? 'income' : 'outcome'}
		oncreated={categoryCreated}
	/>
{/if}

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}

	.form.submitting > :not(:global(.bar)):not(.scroll):not(.actions) {
		opacity: 0.55;
	}

	.form.drawer {
		flex: 1;
		min-height: 0;
		gap: 0;
		padding-top: 0;
	}

	/* The fields scroll; the actions stay pinned below them. */
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

	.centered {
		align-items: stretch;
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
