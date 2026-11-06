<script lang="ts">
	import { untrack } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import { autosave } from '$lib/autosave';
	import { formatAmountInput, formatMoney, parseAmount, type Currency } from '$lib/money';
	import { savingsFromPercent } from '$lib/savings';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	/**
	 * The Ahorro choice as a list: Nada, 10 %, 20 %, Otro (a percentage or a fixed amount), each row showing
	 * what it saves and what is left per day. `autosave`: every pick saves on its own
	 * (`/plan/savings?/update`) with a Deshacer toast. `form` (the wizard): nothing saves here; the choice
	 * posts with the surrounding form as hidden `savingsOption` plus the "Otro" fields.
	 */
	let {
		income,
		currency,
		initial,
		error,
		mode = 'form',
		base = 0,
		daysLeft = 1,
		path = '/plan/savings?/update'
	}: {
		income: number;
		currency: Currency;
		initial: { savings: number; savingsPercent: number | null };
		error?: string;
		mode?: 'form' | 'autosave';
		/** What the month has left before any savings, and the days left in it. */
		base?: number;
		daysLeft?: number;
		path?: string;
	} = $props();

	/** Percent x 100 as es-AR text: 1250 -> "12,5", 1000 -> "10". */
	const percentText = (p: number) =>
		(p / 100).toLocaleString('es-AR', { maximumFractionDigits: 2, useGrouping: false });

	/** The option, unit and value text a stored plan maps to. */
	function fromStored(savings: number, p: number | null) {
		if (p === 1000) return { option: '10', unit: 'percent', value: '' };
		if (p === 2000) return { option: '20', unit: 'percent', value: '' };
		if (p != null && p > 0) return { option: 'other', unit: 'percent', value: percentText(p) };
		if (p == null && savings > 0)
			return { option: 'other', unit: 'amount', value: formatAmountInput(savings, currency) };
		return { option: 'none', unit: 'percent', value: '' };
	}

	const start = untrack(() => fromStored(initial.savings, initial.savingsPercent));

	let option = $state(start.option);
	let unit = $state(start.unit);
	let value = $state(start.value);

	const units = $derived([
		{ value: 'percent', label: '%' },
		{ value: 'amount', label: currency === 'USD' ? 'US$' : '$' }
	]);

	// --- autosave mode ---
	let stored = $state(start);
	let storedSavings = $state(untrack(() => initial.savings));
	let editing = $state(false);
	let message = $state('');

	/** Left to spend per day with `savings` set aside; rounds like the plan's own per-day figure. */
	const perDay = (savings: number) => {
		const step = currency === 'ARS' ? 100 : 1;
		const left = base - savings;
		return left > 0 ? Math.floor(left / daysLeft / step) * step : 0;
	};
	const meta = (savings: number) =>
		`${formatMoney(savings, currency)} · quedan ${formatMoney(perDay(savings), currency)} por día`;

	// Form mode: what the typed "Otro" value saves, or null while it is not valid yet.
	const formOther = $derived.by(() => {
		const v = parseAmount(value);
		if (v === null || v < 0) return null;
		if (unit === 'percent') return v > 0 && v <= 10000 ? savingsFromPercent(income, v) : null;
		return v;
	});

	const current = $derived(mode === 'form' ? option : editing ? 'other' : stored.option);
	/** What each row saves; null for "Otro" until it has a value. */
	const savingsOf = (key: string) =>
		key === '10'
			? savingsFromPercent(income, 1000)
			: key === '20'
				? savingsFromPercent(income, 2000)
				: key === 'other'
					? mode === 'form'
						? option === 'other'
							? formOther
							: null
						: stored.option === 'other'
							? storedSavings
							: null
					: 0;

	const rows = [
		{ key: 'none', label: 'Nada' },
		{ key: '10', label: '10 %' },
		{ key: '20', label: '20 %' },
		{ key: 'other', label: 'Otro' }
	];

	async function save(fields: { option: string; unit: string; value: string }) {
		const before = stored;
		const error = await autosave<{ savings: number; savingsPercent: number | null }>({
			path,
			fields: {
				savingsOption: fields.option,
				savingsUnit: fields.unit,
				savingsValue: fields.value
			},
			previous: {
				savingsOption: before.option,
				savingsUnit: before.unit,
				savingsValue: before.value
			},
			apply: (res) => {
				storedSavings = res.savings;
				stored = fromStored(res.savings, res.savingsPercent);
				option = stored.option;
				unit = stored.unit;
				value = stored.value;
				editing = false;
			}
		});
		message = error ?? '';
	}

	function pick(key: string) {
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

{#snippet otherFields(msg: string | undefined)}
	<ul class="card">
		<li class:bad={msg}>
			<TextRow
				id="savings-value"
				name="savingsValue"
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
						name="savingsUnit"
						options={units}
						bind:value={unit}
						labelledby="savings-unit-label"
						size="compact"
					/>
				{/snippet}
			</TextRow>
		</li>
	</ul>
{/snippet}

<div class="list">
	{#if mode === 'form'}<input type="hidden" name="savingsOption" value={option} />{/if}
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

	{#if mode === 'form'}
		{#if option === 'other'}
			<div class="other">{@render otherFields(error)}</div>
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

	/* Autosave: the four options share one bordered card. */
	.boxed {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 14px;
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

	.card > li.bad {
		box-shadow: inset 3px 0 0 var(--negative);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
		padding: 0 var(--space-4);
	}
</style>
