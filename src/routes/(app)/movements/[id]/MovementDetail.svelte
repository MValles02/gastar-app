<script lang="ts">
	import { type ComponentProps, untrack } from 'svelte';
	import { appear } from '#lib/motion.ts';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import { autosave } from '#lib/autosave.ts';
	import { MIN_DAY } from '#lib/dates.ts';
	import { CURRENCY_SYMBOL } from '#lib/money.ts';
	import { DESCRIPTION_MAX_LENGTH } from '#lib/constants.ts';
	import { es } from '#lib/copy/es.ts';
	import { archived, categoriesFor, kindFits, movementNeeds } from '#lib/movement.ts';
	import { upOnClick } from '#lib/nav-stack.svelte.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { closeAfterDelete, formScreen } from '#lib/components/forms/form-enhance.ts';
	import InlineText from '#lib/components/InlineText.svelte';
	import Amount from '#lib/components/base/Amount.svelte';
	import CrossCurrencyRows from '#lib/components/movements/CrossCurrencyRows.svelte';
	import DatePicker from '#lib/components/pickers/DatePicker.svelte';
	import OptionPicker from '#lib/components/pickers/OptionPicker.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { PageData } from './$types';

	/**
	 * A movement's detail and edit in one: tapping a field changes it, and every change saves on its own
	 * (`?/update`) with a Deshacer toast. Lives over the list as a drawer (shallow route) or as the
	 * full /movements/<id> page (the enclosing FormScreen). A type change that needs a field the movement lacks (category, Hacia,
	 * Cotización) stays staged until that field is picked, then everything saves in one post.
	 */
	let { data }: { data: PageData } = $props();

	type Movement = PageData['movement'];
	const screen = formScreen();
	const drawer = screen.variant === 'drawer';
	const onclose = () => screen.onclose?.();

	let m = $state<Movement>(untrack(() => data.movement));
	// Fixed payments the movement can link to; they depend on its type and account currency, so every save refreshes them.
	let rules = $state(untrack(() => data.rules));
	// What the update action stores, as the strings it takes (the server's `toFormValues`).
	let values = $state<Record<string, string>>(untrack(() => data.values));
	type Saved = { movement: Movement; rules: typeof data.rules; values: typeof data.values };
	function applySaved(r: Saved) {
		m = r.movement;
		rules = r.rules;
		values = r.values;
	}

	// Changes that wait for a field they need (a type or account change missing its category, Hacia or
	// Cotización): they are saved together, in one post, once nothing is missing.
	let pending = $state<Record<string, string>>({});
	const typeStaged = $derived('type' in pending);
	const effType = $derived((pending.type ?? m.type) as Movement['type']);
	const isTransfer = $derived(effType === 'transfer');

	const accounts = $derived(
		data.accounts.map((a) => ({ ...a, name: archived(a.name, a.archived), archived: false }))
	);
	const categories = $derived(
		categoriesFor(data.categories, effType, typeStaged ? null : m.categoryId).map((c) => ({
			...c,
			name: archived(c.name, c.archived),
			archived: false
		}))
	);
	// The stored category only carries over to a new type whose kind accepts it.
	const keptCategory = (type: string) => {
		const c = data.categories.find((c) => c.id === m.categoryId);
		return m.categoryId && (type === m.type || (c && kindFits(c.kind, type))) ? m.categoryId : '';
	};
	const categoryId = $derived(pending.categoryId ?? keptCategory(effType));

	const typeItems: ComponentProps<typeof OptionPicker>['items'] = [
		{ id: 'outcome', name: 'Gasto', icon: 'cart', color: null },
		{ id: 'income', name: 'Ingreso', icon: 'plus', color: null },
		{ id: 'transfer', name: 'Transferencia', icon: 'transfer', color: null }
	];

	let errors = $state<Record<string, string>>({});
	const originId = $derived(pending.accountId ?? m.accountId);
	const destinationId = $derived(pending.destinationAccountId ?? m.destinationAccountId ?? '');
	const currencyOf = (id: string) => data.accounts.find((a) => a.id === id)?.currency;
	const crossCurrency = $derived(
		movementNeeds(effType, { origin: currencyOf(originId), destination: currencyOf(destinationId) })
			.rate
	);

	const path = $derived(resolve(`movements/${m.id}`));

	const ruleItems = $derived([
		{ id: '', name: 'Ninguno', icon: 'categories', color: null },
		...rules
	] as ComponentProps<typeof OptionPicker>['items']);
	async function linkRule(v: string) {
		if (v === (m.recurringId ?? '')) return;
		errors.recurringId =
			(await autosave<Saved>({
				path: `${path}?/link`,
				fields: { recurringId: v },
				previous: { recurringId: m.recurringId ?? '' },
				apply: (r) => {
					applySaved(r);
					errors = {};
				}
			})) ?? '';
	}

	function save(fields: Record<string, string>) {
		// A type or transfer account change can drop or add fields: undo restores the whole prior state.
		const touchesAccount = 'accountId' in fields || 'destinationAccountId' in fields;
		const keys = [
			...Object.keys(fields),
			...('type' in fields
				? ['type', 'accountId', 'destinationAccountId', 'categoryId', 'exchangeRate', 'amount']
				: isTransfer && touchesAccount
					? ['accountId', 'destinationAccountId', 'exchangeRate', 'amount']
					: [])
		];
		const previous = Object.fromEntries(keys.map((k) => [k, values[k]]));
		return autosave<Saved>({
			path: `${path}?/update`,
			fields,
			previous,
			apply: (r) => {
				applySaved(r);
				pending = {};
				errors = {};
			}
		});
	}

	// What the staged fields still lack before the server can take them (same rules as resolveMovement).
	function missing(f: Record<string, string>) {
		const type = f.type ?? m.type;
		const destination = f.destinationAccountId ?? m.destinationAccountId ?? '';
		const needs = movementNeeds(type, {
			origin: currencyOf(f.accountId ?? m.accountId),
			destination: currencyOf(destination)
		});
		if (needs.category) {
			const kept = 'type' in f ? keptCategory(type) : (m.categoryId ?? '');
			return (f.categoryId ?? kept) ? null : 'category';
		}
		if (!destination) return 'destination';
		return needs.rate && !f.exchangeRate && !m.exchangeRate ? 'rate' : null;
	}

	// The picker returns focus to its row as it closes: take it back (or open the one that is needed).
	// Kept on purpose: the picker drawer (vaul-svelte over bits-ui) hands focus back to its trigger as its
	// close animation ends, which would take focus from (or close) anything focused or opened sooner. So
	// the wanted field waits in `wanted` until a picker reports it has finished closing (`runPrompt`).
	let wanted: string | null = null;
	let destinationPicker: OptionPicker | undefined = $state();
	let categoryPicker: OptionPicker | undefined = $state();
	let rateRows: CrossCurrencyRows | undefined = $state();
	const prompt = (what: string) => (wanted = what);
	function runPrompt() {
		const what = wanted;
		wanted = null;
		if (what === 'rate') rateRows?.focus();
		else if (what === 'destination') void destinationPicker?.openSheet();
		else if (what === 'category') void categoryPicker?.openSheet();
	}
	/** Edits that do not go through a picker have no drawer to wait for. */
	const commitThenPrompt = async (extra: Record<string, string>) => {
		const r = await commit(extra);
		runPrompt();
		return r;
	};

	/** Saves the staged fields plus `extra` in one post, or keeps them staged while something is missing. */
	async function commit(extra: Record<string, string>) {
		const fields = { ...pending, ...extra };
		const what = missing(fields);
		if (!what) return save(fields);
		Object.assign(pending, extra);
		if (what === 'category') errors.categoryId = es.movements.errors.category;
		if (what === 'destination') errors.destinationAccountId = es.movements.errors.destination;
		prompt(what);
		return null;
	}

	async function saveField(key: string, value: string) {
		if (value === (pending[key] ?? (typeStaged ? undefined : values[key]))) return;
		errors[key] = (await commit({ [key]: value })) ?? '';
	}

	async function saveAccount(key: 'accountId' | 'destinationAccountId', id: string) {
		if (id === (pending[key] ?? values[key])) return;
		if (id === values[key] && !typeStaged) {
			delete pending[key];
			return;
		}
		errors[key] = (await commit({ [key]: id })) ?? '';
	}

	async function selectType(next: string) {
		if (next === effType) return;
		pending = {};
		errors = {};
		if (next === m.type) return;
		await commit({ type: next });
	}

	const needsRate = $derived(crossCurrency && !m.exchangeRate && !pending.exchangeRate);
	// Closing with a change still waiting for a field drops it: say so.
	$effect(() => () => {
		const p = untrack(() => pending);
		if ('type' in p) toast.error('No se guardó el cambio de tipo.');
		else if (Object.keys(p).length) toast.error('No se guardó el cambio de cuenta.');
	});

	const saveRate = (next: string) => commitThenPrompt({ exchangeRate: next });

	/** Drawer: the delete's answer (the page follows its redirect to the list). */
	const deleted = closeAfterDelete(
		onclose,
		() => (errors.delete = 'No se pudo eliminar el movimiento.')
	);
</script>

{#snippet empty()}<p class="hint">Todavía no hay opciones.</p>{/snippet}

<div class="detail" class:drawer>
	<div class="top">
		<fieldset class="lock" disabled={typeStaged}>
			<h2 class="description">
				<InlineText
					label="Descripción"
					value={values.description}
					maxlength={DESCRIPTION_MAX_LENGTH}
					onsave={(next) => commitThenPrompt({ description: next })}
				>
					{#snippet display()}{m.description}{/snippet}
				</InlineText>
			</h2>
			<div class="amount {effType}">
				<InlineText
					label="Monto"
					inputmode="decimal"
					prefix={CURRENCY_SYMBOL[m.accountCurrency]}
					value={values.amount}
					onsave={(next) => commitThenPrompt({ amount: next })}
				>
					{#snippet display()}
						<Amount
							cents={m.amount}
							currency={m.accountCurrency}
							tone={effType === 'income' ? 'income' : effType === 'outcome' ? 'expense' : 'neutral'}
						/>
					{/snippet}
				</InlineText>
			</div>
		</fieldset>
	</div>

	<ul class="card">
		<li>
			<OptionPicker
				name="type"
				legend="Tipo"
				title="Tipo"
				items={typeItems}
				bind:value={() => effType, (v) => void selectType(v)}
				placeholder="Elegir"
				onclosed={runPrompt}
				{empty}
			/>
		</li>
		<li>
			<fieldset class="lock" disabled={typeStaged}>
				<DatePicker
					presets
					name="occurredAt"
					label="Fecha"
					min={MIN_DAY}
					bind:value={() => values.occurredAt, (v) => void saveField('occurredAt', v)}
					plain
					onclosed={runPrompt}
					error={errors.occurredAt}
					errorId="date-error"
				/>
			</fieldset>
		</li>
		<li>
			<fieldset class="lock" disabled={typeStaged}>
				<OptionPicker
					name="accountId"
					legend={isTransfer ? 'Desde' : 'Cuenta'}
					title={isTransfer ? 'Desde' : 'Cuenta'}
					items={accounts}
					bind:value={() => originId, (v) => void saveAccount('accountId', v)}
					onclosed={runPrompt}
					placeholder="Elegir"
					error={errors.accountId}
					errorId="account-error"
					{empty}
				/>
			</fieldset>
		</li>
		{#if isTransfer}
			<li>
				<OptionPicker
					bind:this={destinationPicker}
					name="destinationAccountId"
					legend="Hacia"
					title="Hacia"
					items={accounts}
					bind:value={() => destinationId, (v) => void saveAccount('destinationAccountId', v)}
					excludeId={originId}
					onclosed={runPrompt}
					placeholder="Elegir"
					error={errors.destinationAccountId}
					errorId="destination-error"
					{empty}
				/>
			</li>
			{#if crossCurrency}
				<CrossCurrencyRows
					bind:this={rateRows}
					rate={values.exchangeRate}
					rateCents={m.exchangeRate}
					open={needsRate}
					required={needsRate}
					onsave={saveRate}
					error={needsRate ? es.movements.errors.rate : undefined}
					converted={m.destinationAmount !== null &&
					m.destinationCurrency &&
					!pending.accountId &&
					!pending.destinationAccountId &&
					!typeStaged
						? { cents: m.destinationAmount, currency: m.destinationCurrency }
						: null}
					destinationFirst
				/>
			{/if}
		{:else}
			<li>
				<OptionPicker
					bind:this={categoryPicker}
					name="categoryId"
					legend="Categoría"
					title="Categoría"
					items={categories}
					bind:value={() => categoryId, (v) => void saveField('categoryId', v)}
					onclosed={runPrompt}
					placeholder="Elegir"
					error={errors.categoryId}
					errorId="category-error"
					{empty}
				/>
			</li>
			{#if !typeStaged && (rules.length || m.recurringId)}
				<li>
					<OptionPicker
						name="recurringId"
						legend={effType === 'income' ? 'Ingreso fijo' : 'Pago fijo'}
						title={effType === 'income' ? 'Ingreso fijo' : 'Pago fijo'}
						items={ruleItems}
						bind:value={() => m.recurringId ?? '', (v) => void linkRule(v)}
						placeholder="Ninguno"
						error={errors.recurringId}
						errorId="rule-error"
						{empty}
					/>
				</li>
			{/if}
		{/if}
	</ul>

	{#if errors.delete}<p class="error" role="alert" in:appear>{errors.delete}</p>{/if}
	<div class="actions">
		<ConfirmDialog
			triggerLabel="Eliminar"
			triggerVariant="destructive"
			triggerClass="w-full"
			title="¿Eliminar este movimiento?"
			confirmLabel="Eliminar"
			action="{path}?/delete"
			closeOnFailure={drawer}
			ondone={drawer ? deleted : undefined}
		>
			Esta acción no se puede deshacer.
		</ConfirmDialog>
		{#if drawer}
			<Button class="w-full" onclick={() => onclose?.()}>Listo</Button>
		{:else}
			<Button class="w-full" href={resolve('movements')} onclick={upOnClick('/movements')}
				>Listo</Button
			>
		{/if}
	</div>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.detail.drawer {
		min-height: 0;
		overflow-y: auto;
		padding: var(--space-1) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
	}

	.top {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		text-align: center;
	}

	.description {
		margin: 0;
		max-width: 100%;
		font-size: var(--font-size-lg);
		font-weight: 600;
		line-height: 1.3;
	}

	.amount {
		max-width: 100%;
		font-family: var(--font-display);
		font-size: var(--font-size-hero);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.amount.outcome {
		color: var(--negative);
	}

	.amount.income {
		color: var(--positive);
	}

	.amount.transfer {
		color: var(--transfer);
	}

	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--card-edge);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	/* The currency symbol stays while the amount is edited, smaller and muted like the read state. */
	.amount :global(.prefix) {
		font-size: 0.55em;
		font-weight: 500;
	}

	.hint {
		padding: var(--space-4);
		color: var(--text-muted);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}
	.lock {
		display: contents;
	}
</style>
