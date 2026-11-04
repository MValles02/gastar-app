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
	 * The Ahorro choice: Nada, 10 %, 20 % or Otro (a percentage or a fixed amount). `form`: a segmented
	 * control that posts with the surrounding form (the wizard). `autosave`: a list where every pick saves
	 * on its own (`/plan/savings?/update`) with a Deshacer toast, each row showing what it saves and what
	 * is left per day.
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
		/** Autosave: what the month has left before any savings, and the days left in it. */
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

	const options = [
		{ value: 'none', label: 'Nada' },
		{ value: '10', label: '10%' },
		{ value: '20', label: '20%' },
		{ value: 'other', label: 'Otro' }
	];
	const units = $derived([
		{ value: 'percent', label: '%' },
		{ value: 'amount', label: currency === 'USD' ? 'US$' : '$' }
	]);

	// Percent x 100 behind the current choice, or null for none / a fixed amount / an invalid value.
	const percent = $derived.by(() => {
		if (option === '10' || option === '20') return Number(option) * 100;
		if (option !== 'other' || unit !== 'percent') return null;
		const p = parseAmount(value);
		return p !== null && p > 0 && p <= 10000 ? p : null;
	});

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

	const rows = $derived([
		{ key: 'none', label: 'Nada', savings: 0 },
		{ key: '10', label: '10 %', savings: savingsFromPercent(income, 1000) },
		{ key: '20', label: '20 %', savings: savingsFromPercent(income, 2000) },
		{ key: 'other', label: 'Otro', savings: storedSavings }
	]);

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
		if (key === 'other') {
			editing = true;
			return;
		}
		editing = false;
		message = '';
		if (key !== stored.option) void save({ option: key, unit: 'percent', value: '' });
	}
</script>

{#if mode === 'form'}
	<div class="fields">
		<span id="savings-label" class="visually-hidden">Ahorro</span>
		<SegmentedControl
			name="savingsOption"
			{options}
			bind:value={option}
			labelledby="savings-label"
		/>

		{#if option === 'other'}
			<ul class="card">
				<li class:bad={error}>
					<TextRow
						id="savings-value"
						name="savingsValue"
						label="Ahorro"
						bind:value
						placeholder="0"
						inputmode="decimal"
						amount
						{error}
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
		{:else if error}
			<p class="error" role="alert">{error}</p>
		{/if}

		{#if percent !== null}
			<p class="hint">
				{percentText(percent)}% de {formatMoney(income, currency)} = {formatMoney(
					savingsFromPercent(income, percent),
					currency
				)}
			</p>
		{/if}

		<p class="hint">Ingresos totales: {formatMoney(income, currency)}</p>
	</div>
{:else}
	<div class="list">
		{#each rows as row (row.key)}
			{@const on = row.key === (editing ? 'other' : stored.option)}
			<button type="button" class="opt" aria-pressed={on} onclick={() => pick(row.key)}>
				<span class="text">
					<span class="name">{row.label}</span>
					{#if row.key !== 'other' || stored.option === 'other'}
						<span class="meta">{meta(row.key === 'other' ? storedSavings : row.savings)}</span>
					{/if}
				</span>
				{#if on}<Check size={20} strokeWidth={1.75} aria-hidden="true" />{/if}
			</button>
		{/each}

		{#if editing}
			<form
				class="other"
				onsubmit={(e) => {
					e.preventDefault();
					void save({ option: 'other', unit, value });
				}}
			>
				<ul class="card">
					<li class:bad={message}>
						<TextRow
							id="savings-value"
							name="savingsValue"
							label="Ahorro"
							bind:value
							placeholder="0"
							inputmode="decimal"
							amount
							error={message}
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
				<Button type="submit" class="w-full">Guardar</Button>
			</form>
		{:else if message}
			<p class="error" role="alert">{message}</p>
		{/if}
	</div>
{/if}

<style>
	.fields,
	.list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.list {
		gap: 0;
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

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.list .error {
		padding: 0 var(--space-4);
	}
</style>
