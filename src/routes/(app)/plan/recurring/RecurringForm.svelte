<script lang="ts">
	import { onMount, tick, untrack, type ComponentProps } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button/index.js';
	import AmountHero from '$lib/components/AmountHero.svelte';
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import EntryFields from '$lib/components/EntryFields.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import OptionPicker from '$lib/components/OptionPicker.svelte';

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
		type
	}: {
		initial: Record<Fields, string>;
		errors?: Partial<Record<Fields, string>>;
		accounts: Picker[];
		categories: (Picker & { kind: string | null })[];
		action?: string;
		submitLabel: string;
		cancelHref?: string;
		/** `income` or `outcome`; fixed for the form and sent as a hidden field. */
		type: string;
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
	<input type="hidden" name="type" value={type} />
	{#if errors.type}<p class="error" role="alert">{errors.type}</p>{/if}

	<AmountHero bind:value={amount} {currency} error={errors.amount} id="ramount" />

	<EntryFields bind:description descriptionId="rdescription" descriptionError={errors.description}>
		{#snippet account()}
			<li class:bad={errors.accountId}>
				<OptionPicker
					variant="row"
					name="accountId"
					legend="Cuenta"
					title="Elegí la cuenta"
					items={accounts}
					bind:value={accountId}
					placeholder="Elegir"
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
		{/snippet}

		{#snippet category()}
			<li class:bad={errors.categoryId}>
				<OptionPicker
					variant="row"
					name="categoryId"
					legend="Categoría"
					title="Elegí la categoría"
					items={pickableCategories}
					bind:value={categoryId}
					placeholder="Elegir"
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
		{/snippet}

		{#snippet when()}
			<li class:bad={errors.dayOfMonth}>
				{#if mounted}
					<Button
						variant="ghost"
						class="h-14 w-full scroll-mb-24 justify-between gap-3 rounded-none px-4"
						aria-haspopup="dialog"
						aria-labelledby="rday-label rday-value"
						aria-describedby={errors.dayOfMonth ? 'rday-error' : undefined}
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
							aria-describedby={errors.dayOfMonth ? 'rday-error' : undefined}
						/>
					</label>
				{/if}
				{#if errors.dayOfMonth}
					<p class="error pad" id="rday-error" role="alert">{errors.dayOfMonth}</p>
				{/if}
			</li>
		{/snippet}
	</EntryFields>
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
		</BottomDrawer>
	{/if}
	<FormActions {cancelHref} {submitLabel} />
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
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
</style>
