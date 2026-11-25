<script lang="ts">
	import { appear } from '#lib/motion.ts';
	import type { Snippet } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import InlineText from '#lib/components/InlineText.svelte';
	import { formatMoney, RATE_CURRENCY, type Currency } from '#lib/money.ts';

	/**
	 * A cross-currency transfer's Cotización and En destino rows (`<li>`s of a card), shared by the
	 * movement form and the movement detail. Tapping Cotización edits the rate in place.
	 */
	let {
		rate,
		rateCents,
		onsave,
		open = false,
		required = false,
		error,
		errorId,
		converted,
		destinationFirst = false,
		hidden
	}: {
		/** The rate as typed (InlineText's value). */
		rate: string;
		/** The rate shown, in hundredths; null shows "Ingresar". */
		rateCents: number | null;
		onsave: (next: string) => Promise<string | null>;
		open?: boolean;
		required?: boolean;
		/** Shown under the rate row; with `errorId` it also marks the rate input invalid. */
		error?: string;
		errorId?: string;
		/** The amount the destination gets; null shows "—". */
		converted: { cents: number; currency: Currency } | null;
		/** En destino above Cotización (the detail) instead of below it (the form). */
		destinationFirst?: boolean;
		/** Inside the rate row, after it (e.g. the form's hidden input). */
		hidden?: Snippet;
	} = $props();

	let rateInput: InlineText | undefined = $state();
	/** Focuses the rate input (when it is being edited). */
	export function focus() {
		rateInput?.focus();
	}
</script>

{#snippet rateRow()}
	<li class:bad={!!error && !!errorId}>
		<div class="row spread rate">
			<span class="k">Cotización</span>
			<span class="v">
				<InlineText
					bind:this={rateInput}
					label="Cotización"
					inputmode="numeric"
					prefix="1 USD = $"
					value={rate}
					{open}
					{required}
					invalid={error && errorId ? errorId : undefined}
					{onsave}
				>
					{#snippet display()}
						<span class:placeholder={rateCents === null}
							>{rateCents !== null
								? `1 USD = ${formatMoney(rateCents, RATE_CURRENCY)}`
								: 'Ingresar'}</span
						>
						<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" class="chev" />
					{/snippet}
				</InlineText>
			</span>
		</div>
		{@render hidden?.()}
		{#if error}<p class="error pad" id={errorId} role="alert" in:appear>{error}</p>{/if}
	</li>
{/snippet}

{#snippet destinationRow()}
	<li>
		<p class="row spread" aria-live="polite">
			<span class="k">En destino</span>
			{#if converted}
				<span class="v converted">{formatMoney(converted.cents, converted.currency)}</span>
			{:else}
				<span class="v placeholder">—</span>
			{/if}
		</p>
	</li>
{/snippet}

{#if destinationFirst}
	{@render destinationRow()}
	{@render rateRow()}
{:else}
	{@render rateRow()}
	{@render destinationRow()}
{/if}

<style>
	.row {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-3);
		min-height: 3.5rem;
		margin: 0;
		padding: 0 var(--space-4);
		font-size: var(--font-size-base);
		color: var(--text);
	}

	.spread {
		justify-content: space-between;
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

	/* Same label weight as the picker rows (ghost buttons). */
	.spread .k {
		font-weight: 500;
	}

	/* The rate trigger fills the row so the whole value side is tappable, chevron at the end. */
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

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.error.pad {
		padding: 0 var(--space-4) var(--space-3);
	}
</style>
