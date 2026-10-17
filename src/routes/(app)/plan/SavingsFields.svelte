<script lang="ts">
	import { untrack } from 'svelte';
	import { formatAmountInput, formatMoney, parseAmount, type Currency } from '$lib/money';
	import { savingsFromPercent } from '$lib/savings';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TextRow from '$lib/components/TextRow.svelte';

	let {
		income,
		currency,
		initial,
		error
	}: {
		income: number;
		currency: Currency;
		initial: { savings: number; savingsPercent: number | null };
		error?: string;
	} = $props();

	/** Percent x 100 as es-AR text: 1250 -> "12,5", 1000 -> "10". */
	const percentText = (p: number) =>
		(p / 100).toLocaleString('es-AR', { maximumFractionDigits: 2, useGrouping: false });

	const start = untrack(() => {
		const { savings, savingsPercent: p } = initial;
		if (p === 1000) return { option: '10', unit: 'percent', value: '' };
		if (p === 2000) return { option: '20', unit: 'percent', value: '' };
		if (p != null && p > 0) return { option: 'other', unit: 'percent', value: percentText(p) };
		if (p == null && savings > 0)
			return { option: 'other', unit: 'amount', value: formatAmountInput(savings, currency) };
		return { option: 'none', unit: 'percent', value: '' };
	});

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
</script>

<div class="fields">
	<span id="savings-label" class="visually-hidden">Ahorro</span>
	<SegmentedControl name="savingsOption" {options} bind:value={option} labelledby="savings-label" />

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

<style>
	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
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
</style>
