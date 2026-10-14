<script lang="ts">
	import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
	import { onMount, tick, untrack, type ComponentProps } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button/index.js';
	import AmountHero from '$lib/components/AmountHero.svelte';
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TextRow from '$lib/components/TextRow.svelte';

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
		inline = false,
		type = $bindable(untrack(() => initial.type || 'outcome'))
	}: {
		initial: Record<Fields, string>;
		errors?: Partial<Record<Fields, string>>;
		accounts: Picker[];
		categories: (Picker & { kind: string | null })[];
		action?: string;
		submitLabel: string;
		cancelHref?: string;
		/** Embedded in a screen with the tab bar and its own hero: amount as a row, save bar not pinned. */
		inline?: boolean;
		/** `income` or `outcome`; bindable so the screen title can follow the toggle. */
		type?: string;
	} = $props();

	let accountId = $state(untrack(() => initial.accountId));
	let amount = $state(untrack(() => initial.amount));
	let description = $state(untrack(() => initial.description));
	let day = $state(untrack(() => initial.dayOfMonth));
	let dayOpen = $state(false);
	let dayTrigger: HTMLButtonElement | null = $state(null);
	let categoryId = $state(untrack(() => initial.categoryId));
	let mounted = $state(false);
	onMount(() => (mounted = true));

	// Without JS the type changes without a reload, so every category is listed (the server validates).
	// The rule's own saved category stays pickable.
	const pickableCategories = $derived(
		mounted
			? categories.filter(
					(c) => c.kind === null || c.kind === type || c.id === untrack(() => initial.categoryId)
				)
			: categories
	);
	$effect(() => {
		if (categoryId && !pickableCategories.some((c) => c.id === categoryId)) categoryId = '';
	});

	const typeOptions = [
		{ value: 'income', label: 'Ingreso' },
		{ value: 'outcome', label: 'Pago' }
	];
	const currency = $derived.by(() => {
		const meta = accounts.find((a) => a.id === accountId)?.meta;
		return meta === 'USD' ? 'USD' : meta === 'ARS' ? 'ARS' : undefined;
	});
	const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

	async function chooseDay(d: string) {
		day = d;
		dayOpen = false;
		await tick();
		dayTrigger?.focus();
	}

	// After a failed submit, move focus to the first field marked invalid (inputs or picker triggers).
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

<form method="POST" {action} use:enhance class="form" novalidate>
	<div class="field">
		<span id="rtype-label" class="visually-hidden">Tipo</span>
		<SegmentedControl
			name="type"
			options={typeOptions}
			bind:value={type}
			labelledby="rtype-label"
		/>
		{#if errors.type}<p class="error" role="alert">{errors.type}</p>{/if}
	</div>

	{#if !inline}
		<AmountHero bind:value={amount} {currency} error={errors.amount} id="ramount" />
	{/if}

	<ul class="card">
		{#if inline}
			<li class:bad={errors.amount}>
				<TextRow
					id="ramount"
					name="amount"
					label="Monto"
					bind:value={amount}
					placeholder={currency === 'USD' ? '0,00' : '0'}
					inputmode={currency === 'USD' ? 'decimal' : 'numeric'}
					amount
					error={errors.amount}
					errorId="ramount-error"
				/>
			</li>
		{/if}

		<li class:bad={errors.description}>
			<TextRow
				id="rdescription"
				name="description"
				label="Descripción"
				bind:value={description}
				placeholder={type === 'income' ? 'Sueldo' : 'Alquiler'}
				maxlength={DESCRIPTION_MAX_LENGTH}
				required
				error={errors.description}
				errorId="rdesc-error"
			/>
		</li>

		<li class:bad={errors.dayOfMonth}>
			{#if mounted}
				<Button
					variant="ghost"
					class="h-14 w-full scroll-mb-24 justify-between gap-3 rounded-none px-4"
					aria-haspopup="dialog"
					aria-labelledby="rday-label rday-value"
					aria-describedby="rday-hint{errors.dayOfMonth ? ' rday-error' : ''}"
					bind:ref={dayTrigger}
					onclick={() => (dayOpen = true)}
				>
					<span id="rday-label" class="text-base font-normal">Día del mes</span>
					<span id="rday-value" class="flex-1 text-right" class:text-muted-foreground={!day}>
						{day || 'Elegir'}
					</span>
					<ChevronRight
						size={16}
						strokeWidth={1.75}
						aria-hidden="true"
						class="text-muted-foreground"
					/>
				</Button>
				<!-- The Drawer is portaled out of the form, so the value submits through this input. -->
				<input type="hidden" name="dayOfMonth" value={day} />
			{:else}
				<label class="row" for="rday">
					<span>Día del mes</span>
					<input
						id="rday"
						name="dayOfMonth"
						type="number"
						inputmode="numeric"
						min="1"
						max="31"
						value={day}
						aria-invalid={errors.dayOfMonth ? 'true' : undefined}
						aria-describedby="rday-hint{errors.dayOfMonth ? ' rday-error' : ''}"
					/>
				</label>
			{/if}
			<p id="rday-hint" class="hint pad">Si el mes es más corto, vence el último día.</p>
			{#if errors.dayOfMonth}
				<p class="error pad" id="rday-error" role="alert">{errors.dayOfMonth}</p>
			{/if}
		</li>

		<li class:bad={errors.accountId}>
			<OptionPicker
				variant="row"
				name="accountId"
				legend="Cuenta"
				title="Elegí la cuenta"
				items={accounts}
				bind:value={accountId}
				placeholder="Elegir cuenta"
				error={errors.accountId}
				errorId="raccount-error"
			>
				{#snippet empty()}
					<p class="hint pad">
						Todavía no tenés cuentas. <a href={resolve('/accounts/new')}>Crear cuenta</a>
					</p>
				{/snippet}
			</OptionPicker>
		</li>

		<li class:bad={errors.categoryId}>
			<OptionPicker
				variant="row"
				name="categoryId"
				legend="Categoría"
				title="Elegí la categoría"
				items={pickableCategories}
				bind:value={categoryId}
				placeholder="Elegir categoría"
				error={errors.categoryId}
				errorId="rcategory-error"
			>
				{#snippet empty()}
					<p class="hint pad">
						Todavía no tenés categorías. <a href={resolve('/categories/new')}>Crear categoría</a>
					</p>
				{/snippet}
			</OptionPicker>
		</li>
	</ul>
	{#if mounted}
		<BottomDrawer title="Día del mes" bind:open={dayOpen}>
			<div class="days">
				{#each days as d (d)}
					<Button
						type="button"
						variant={d === day ? 'default' : 'outline'}
						class="h-11 px-0"
						aria-pressed={d === day}
						onclick={() => chooseDay(d)}>{d}</Button
					>
				{/each}
			</div>
			<p class="hint drawer-hint">Si el mes es más corto, vence el último día.</p>
		</BottomDrawer>
	{/if}
	<FormActions {cancelHref} {submitLabel} sticky={!inline} />
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
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

	.card > li + li {
		border-top: 1px solid var(--border);
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

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.error.pad {
		padding-top: 0;
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-base);
	}

	.row input {
		flex: 1 1 4rem;
		min-width: 0;
		width: auto;
		min-height: 3.5rem;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		text-align: right;
	}

	.days {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: var(--space-2);
	}

	.drawer-hint {
		margin-top: var(--space-3);
	}
</style>
