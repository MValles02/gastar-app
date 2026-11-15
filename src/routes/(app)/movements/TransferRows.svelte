<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import InlineText from '#lib/components/InlineText.svelte';
	import OptionPicker from '#lib/components/OptionPicker.svelte';
	import TextRow from '#lib/components/TextRow.svelte';
	import { formatMoney, parseAmount, type Currency } from '#lib/money.ts';

	let {
		showTransfer,
		showRate,
		mounted,
		drawer,
		accountItems,
		accountId,
		destCurrency,
		converted,
		shown,
		destinationId = $bindable(),
		rate = $bindable()
	}: {
		showTransfer: boolean;
		showRate: boolean;
		mounted: boolean;
		drawer: boolean;
		accountItems: ComponentProps<typeof OptionPicker>['items'];
		accountId: string;
		destCurrency: Currency | undefined;
		converted: number | null;
		shown: Partial<Record<'destinationAccountId' | 'exchangeRate', string>>;
		destinationId: string;
		rate: string;
	} = $props();
</script>

{#if showTransfer}
	<li class:bad={shown.destinationAccountId}>
		{#if !mounted}<p class="hint pad">Solo para transferencias</p>{/if}
		<OptionPicker
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
			{#snippet empty()}<p class="hint pad">Necesitás otra cuenta para transferir.</p>{/snippet}
		</OptionPicker>
	</li>
{/if}

{#if !mounted || showRate}
	<li class:bad={shown.exchangeRate}>
		{#if !mounted}<p class="hint pad">Solo para transferencias entre monedas distintas</p>{/if}
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

<style>
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
