<script lang="ts">
	import { untrack } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import { autosave } from '#lib/autosave.ts';
	import { CURRENCY_SYMBOL, formatMoney, type Currency } from '#lib/money.ts';
	import {
		otherSavings,
		perDayLeft,
		presetPercent,
		SAVINGS_FIELDS,
		SAVINGS_PRESETS,
		savingsChoice,
		savingsFromPercent,
		type PlanSavings,
		type SavingsChoice,
		type SavingsOption,
		type SavingsUnit
	} from '#lib/plan.ts';
	import Group from '#lib/components/base/Group.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import TextRow from '#lib/components/TextRow.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';

	/**
	 * The Ahorro choice as a list: Nada, 10 %, 20 %, Otro (a percentage or a fixed amount), each row showing
	 * what it saves and what is left per day. `autosave`: every pick saves on its own (to `path`) with a
	 * Deshacer toast. `form` (the wizard): nothing saves here; the choice posts with the surrounding form
	 * as hidden `savingsOption` plus the "Otro" fields.
	 */
	let {
		income,
		initial,
		error,
		mode,
		path,
		currency,
		base,
		daysLeft
	}: {
		income: number;
		initial: PlanSavings;
		error?: string;
		currency: Currency;
		/** What the month has left before any savings, and the days left in it. */
		base: number;
		daysLeft: number;
	} & ({ mode: 'form'; path?: never } | { mode: 'autosave'; path: string }) = $props();

	const start = untrack(() => savingsChoice(initial, currency));

	let option = $state(start.option);
	let unit = $state(start.unit);
	let value = $state(start.value);

	const units: { value: SavingsUnit; label: string }[] = $derived([
		{ value: 'percent', label: '%' },
		{ value: 'amount', label: CURRENCY_SYMBOL[currency] }
	]);

	let stored = $state(start);
	let storedSavings = $state(untrack(() => initial.savings));
	let editing = $state(false);
	let message = $state('');

	const meta = (savings: number) =>
		`${formatMoney(savings, currency)} · quedan ${formatMoney(perDayLeft(base - savings, daysLeft, currency), currency)} por día`;

	// Form mode: what the typed "Otro" value saves, or null while it is not valid yet.
	const formOther = $derived(otherSavings(unit, value, income)?.savings ?? null);

	const current = $derived(mode === 'form' ? option : editing ? 'other' : stored.option);
	/** What each row saves; null for "Otro" until it has a value. */
	function savingsOf(key: SavingsOption) {
		const preset = presetPercent(key);
		if (preset !== null) return savingsFromPercent(income, preset);
		if (key !== 'other') return 0;
		if (mode === 'form') return option === 'other' ? formOther : null;
		return stored.option === 'other' ? storedSavings : null;
	}

	const rows: { key: SavingsOption; label: string }[] = [
		{ key: 'none', label: 'Nada' },
		...SAVINGS_PRESETS.map((n) => ({ key: `${n}` as const, label: `${n} %` })),
		{ key: 'other', label: 'Otro' }
	];

	const toFields = (c: SavingsChoice) => ({
		[SAVINGS_FIELDS.option]: c.option,
		[SAVINGS_FIELDS.unit]: c.unit,
		[SAVINGS_FIELDS.value]: c.value
	});

	async function save(next: SavingsChoice) {
		const before = stored;
		const error = await autosave<PlanSavings>({
			path: path!,
			fields: toFields(next),
			previous: toFields(before),
			apply: (res) => {
				storedSavings = res.savings;
				stored = savingsChoice(res, currency);
				option = stored.option;
				unit = stored.unit;
				value = stored.value;
				editing = false;
			}
		});
		message = error ?? '';
	}

	function pick(key: SavingsOption) {
		if (mode === 'form') {
			option = key;
			return;
		}
		if (key === 'other') {
			editing = true;
			return;
		}
		editing = false;
		message = '';
		if (key !== stored.option) void save({ option: key, unit: 'percent', value: '' });
	}
</script>

{#snippet otherField(msg: string | undefined)}
	<TextRow
		id="savings-value"
		name={SAVINGS_FIELDS.value}
		label="Ahorro"
		bind:value
		placeholder="0"
		inputmode="decimal"
		amount
		error={msg}
		errorId="savings-error"
	>
		{#snippet end()}
			<span id="savings-unit-label" class="visually-hidden">Unidad</span>
			<SegmentedControl
				name={SAVINGS_FIELDS.unit}
				options={units}
				bind:value={unit}
				labelledby="savings-unit-label"
				class="flex-auto px-2 whitespace-nowrap"
			/>
		{/snippet}
	</TextRow>
{/snippet}

<!-- Autosave: a rows card of its own. Form: a plain row, since the setup wraps the options in a card. -->
{#snippet otherFields(msg: string | undefined)}
	{#if mode === 'autosave'}
		<Group><li class:bad={msg}>{@render otherField(msg)}</li></Group>
	{:else}
		{@render otherField(msg)}
	{/if}
{/snippet}

{#snippet options()}
	<div class="opts" class:boxed={mode === 'autosave'}>
		{#each rows as row (row.key)}
			{@const on = row.key === current}
			{@const saved = savingsOf(row.key)}
			<button type="button" class="opt" aria-pressed={on} onclick={() => pick(row.key)}>
				<span class="text">
					<span class="name" class:on>{row.label}</span>
					{#if saved !== null}<span class="meta">{meta(saved)}</span>{/if}
				</span>
				{#if on}<Check size={20} strokeWidth={1.75} aria-hidden="true" class="check" />{/if}
			</button>
		{/each}
	</div>
{/snippet}

<div class="list">
	{#if mode === 'form'}<input type="hidden" name={SAVINGS_FIELDS.option} value={option} />{/if}
	<!-- Autosave: the four options share one card (the setup form wraps them in its own). -->
	{#if mode === 'autosave'}
		<Card.Root class="gap-0 py-0">{@render options()}</Card.Root>
	{:else}
		{@render options()}
	{/if}

	{#if mode === 'form'}
		{#if option === 'other'}
			<div class="other form">{@render otherFields(error)}</div>
		{:else if error}
			<p class="error" role="alert">{error}</p>
		{/if}
	{:else if editing}
		<form
			class="other"
			onsubmit={(e) => {
				e.preventDefault();
				void save({ option: 'other', unit, value });
			}}
		>
			{@render otherFields(message)}
			<Button type="submit" class="w-full">Guardar</Button>
		</form>
	{:else if message}
		<p class="error" role="alert">{message}</p>
	{/if}
</div>

<style>
	.list {
		display: flex;
		flex-direction: column;
	}

	.opt {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-4);
		border: 0;
		border-radius: var(--radius);
		background: transparent;
		color: var(--text);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.opt:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
	}

	@media (hover: hover) {
		.opt:hover {
			background: var(--muted);
		}
	}

	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.name {
		font-weight: 500;
	}

	.meta {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.boxed .opt {
		min-height: 58px;
		padding: 8px 16px;
		border-radius: 0;
	}

	.boxed .name {
		font-size: 15px;
		font-weight: 400;
	}

	.boxed .name.on {
		font-weight: 600;
	}

	.boxed .meta {
		font-size: 13px;
	}

	.boxed :global(.check) {
		flex: none;
		color: var(--primary);
	}

	.other {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-2) 0 0;
	}

	.other.form {
		padding: 0;
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
		padding: 0 var(--space-4);
	}
</style>
