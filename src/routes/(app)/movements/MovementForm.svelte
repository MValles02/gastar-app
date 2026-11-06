<script lang="ts">
	import type { Currency } from '$lib/money';
	import { MOVEMENT_MESSAGES } from '$lib/movement-messages';
	import { onMount, tick, untrack, type ComponentProps } from 'svelte';
	import { toast } from 'svelte-sonner';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Lock from '@lucide/svelte/icons/lock';
	import Plus from '@lucide/svelte/icons/plus';
	import { enhance } from '$app/forms';
	import { followRedirect } from '$lib/nav-stack.svelte';
	import { resolve } from '$app/paths';
	import AmountHero from '$lib/components/AmountHero.svelte';
	import CategoryCreateDrawer, {
		type CreatedCategory
	} from '$lib/components/CategoryCreateDrawer.svelte';
	import EntryFields from '$lib/components/EntryFields.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import InlineText from '$lib/components/InlineText.svelte';
	import MovementDatePicker from '$lib/components/MovementDatePicker.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import SwitchRow from '$lib/components/SwitchRow.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		convertAmount,
		formatMoney,
		isWholeFor,
		isPositiveAmount,
		parseAmount
	} from '$lib/money';

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
		recurring,
		repeatable = false,
		repeatChecked = false,
		variant = 'page',
		onsaved,
		onclose
	}: {
		initial: Record<Fields, string>;
		errors?: Partial<Record<Fields, string>>;
		accounts: (Picker & { currency: Currency; balance?: number })[];
		categories: (Picker & { kind: string | null })[];
		submitLabel: string;
		cancelHref: string;
		/** Where saving returns to (validated by the action); none keeps the user on the form. */
		returnTo?: string | null;
		/** Registering a payment of this recurring rule. */
		recurring?: { id: string; type: string; description: string };
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

	// A rule fixes the type: no selector and, without JS too, no transfer-only fields.
	const typeFixed = $derived(!!recurring);
	const isTransfer = $derived(type === 'transfer');
	const showTransfer = $derived(!typeFixed && (!mounted || isTransfer));
	const showCategory = $derived(typeFixed || !mounted || !isTransfer);

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

	const converted = $derived.by(() => {
		const a = parseAmount(amount);
		const r = parseAmount(rate);
		if (!showRate || !originCurrency || !destCurrency) return null;
		if (a === null || a <= 0 || r === null || r <= 0) return null;
		return convertAmount(a, r, originCurrency, destCurrency);
	});

	// Drawer: Guardar waits for the two fields every movement needs; the rest is checked on press.
	const canSave = $derived(isPositiveAmount(amount) && description.trim() !== '');

	/** The rows still missing a value (drawer): same fields and messages as the server. */
	function missing() {
		const e: Partial<Record<Fields, string>> = {};
		if (!accountId) e.accountId = MOVEMENT_MESSAGES.account;
		if (isTransfer) {
			if (!destinationId) e.destinationAccountId = MOVEMENT_MESSAGES.destination;
			const r = parseAmount(rate);
			if (showRate && (r === null || r <= 0 || !isWholeFor(r, 'ARS')))
				e.exchangeRate = MOVEMENT_MESSAGES.rate;
		} else if (!categoryId) e.categoryId = MOVEMENT_MESSAGES.category;
		return e;
	}
</script>

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

{#snippet fields()}
	{#if returnTo}<input type="hidden" name="returnTo" value={returnTo} />{/if}
	{#if recurring}
		<input type="hidden" name="recurringId" value={recurring.id} />
		{#if !drawer}
			<p class="hint note">
				Registrás {recurring.type === 'income' ? 'el ingreso' : 'el pago'} de
				<strong>{recurring.description}</strong> de este mes.
			</p>
		{/if}
	{/if}

	{#if typeFixed}
		<input type="hidden" name="type" value={recurring?.type ?? type} />
	{:else}
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
	{/if}

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
		extra={repeatable && !recurring && showCategory ? repeat : undefined}
	>
		{#snippet account()}
			<li class:bad={shown.accountId}>
				<OptionPicker
					variant="row"
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
						variant="row"
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

			{#if (!mounted && !typeFixed) || showRate}
				<li class:bad={shown.exchangeRate}>
					{#if !mounted}<p class="hint pad">
							Solo para transferencias entre monedas distintas
						</p>{/if}
					{#if mounted}
						<!-- A value row like the pickers: tapping it edits the rate in place. -->
						<div class="row spread rate">
							<span class="k">Cotización</span>
							<span class="v">
								<InlineText
									label="Cotización"
									inputmode="numeric"
									prefix="1 USD = $"
									value={rate}
									required
									invalid={shown.exchangeRate ? 'rate-error' : undefined}
									onsave={async (next) => {
										rate = next;
										return null;
									}}
								>
									{#snippet display()}
										{@const r = parseAmount(rate)}
										<span class:placeholder={r === null}
											>{r !== null ? `1 USD = ${formatMoney(r, 'ARS')}` : 'Ingresar'}</span
										>
										<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" class="chev" />
									{/snippet}
								</InlineText>
							</span>
						</div>
						<input type="hidden" name="exchangeRate" value={rate} />
						{#if shown.exchangeRate}
							<p class="error pad" id="rate-error" role="alert">{shown.exchangeRate}</p>
						{/if}
					{:else}
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
					{/if}
				</li>
				{#if mounted}
					<li>
						<p class="row spread" aria-live="polite">
							<span class="k">En destino</span>
							{#if converted !== null && destCurrency}
								<span class="v converted">{formatMoney(converted, destCurrency)}</span>
							{:else}
								<span class="v placeholder">—</span>
							{/if}
						</p>
					</li>
				{/if}
			{/if}
		{/snippet}

		{#snippet category()}
			{#if showCategory}
				<li class:bad={shown.categoryId && !recurring}>
					{#if !mounted}<p class="hint pad">Solo para ingresos y gastos</p>{/if}
					{#if recurring}
						<!-- The payment always takes the rule's category (the server ignores any other). -->
						<input type="hidden" name="categoryId" value={categoryId} />
						<p class="row locked">
							<span class="k">Categoría</span>
							<span class="v">
								{categories.find((c) => c.id === categoryId)?.name ?? ''}
								{#if !drawer}<Lock size={16} strokeWidth={1.75} aria-hidden="true" />{/if}
							</span>
						</p>
						{#if !drawer}<p class="hint pad">Se registra en la categoría del pago.</p>{/if}
					{:else}
						<OptionPicker
							variant="row"
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
										<a href={resolve('/categories/new')}>Crear categoría</a>
									</p>
								{/if}
							{/snippet}
						</OptionPicker>
					{/if}
				</li>
			{/if}
		{/snippet}

		{#snippet when()}
			<li class:bad={shown.occurredAt}>
				<MovementDatePicker
					name="occurredAt"
					label="Fecha"
					min="2000-01-01"
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
	action={drawer ? resolve('/movements/new') : undefined}
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

{#if drawer && !recurring}
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

	.note {
		margin-bottom: calc(var(--space-3) * -1);
		text-align: center;
	}

	.row {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-base);
		color: var(--text);
	}

	.locked,
	.spread {
		justify-content: space-between;
	}

	.locked {
		color: var(--text-muted);
	}

	/* The drawer shows the rule's category like any other row (no lock, normal label). */
	.drawer .locked {
		color: var(--text);
	}

	.spread .v {
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	}

	.spread .converted {
		color: var(--transfer);
		font-weight: 600;
	}

	.placeholder {
		color: var(--text-muted);
		font-weight: 400;
	}

	/* The rate trigger fills the row so the whole value side is tappable, chevron at the end. */
	/* Same label weight as the picker rows (ghost buttons). */
	.spread .k {
		font-weight: 500;
	}

	.rate :global(.edit) {
		white-space: nowrap;
	}

	.rate .v {
		flex: 1;
		min-width: 0;
		text-align: right;
	}

	.rate :global(.trigger) {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		width: 100%;
		cursor: pointer;
	}

	.rate :global(.chev) {
		flex: none;
		color: var(--text-muted);
	}

	.locked .v {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text);
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

	.error.pad {
		padding: 0 var(--space-4) var(--space-3);
	}
</style>
