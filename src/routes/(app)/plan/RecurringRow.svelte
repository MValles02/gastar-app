<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Item from '$lib/components/ui/item/index.js';
	import Money from '$lib/components/Money.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import { DUE_TONE } from '$lib/status';
	import type { RecurringStatus } from '$lib/server/plan';
	import type { Currency } from '$lib/money';

	type Row = {
		id: string;
		type: string;
		description: string;
		amount: number;
		accountName: string;
		day: number;
	} & (
		| { status: RecurringStatus; label: string; reason?: undefined }
		| { reason: string; status?: undefined; label?: undefined }
	);

	let { row, currency, wizard }: { row: Row; currency: Currency; wizard?: number } = $props();
	const r = $derived(row);
</script>

<!-- Each row opens the detail, where "Registrar pago" lives. -->
<div role="listitem" class="rule" class:inactive={!!r.reason}>
	<Item.Root>
		{#snippet child({ props })}
			<a href={resolve(`/plan/recurring/${r.id}${wizard ? `?wizard=${wizard}` : ''}`)} {...props}>
				<Item.Media>
					<span class="lead" aria-hidden="true">{r.description.charAt(0).toUpperCase()}</span>
				</Item.Media>
				<Item.Content class="min-w-0">
					<Item.Title class="block w-full min-w-0 truncate">{r.description}</Item.Title>
					<Item.Description class="line-clamp-none min-w-0">
						<span class="sub">
							{#if r.reason}
								<StatusPill tone="neutral" label={r.reason} />
							{:else}
								<StatusPill tone={DUE_TONE[r.status!]} label={r.label!} />
							{/if}
							<span class="sub-text">Día {r.day} · {r.accountName}</span>
						</span>
					</Item.Description>
				</Item.Content>
				<Item.Actions>
					<span class="amount-col">
						{#if r.reason}
							<Money cents={r.amount} {currency} />
						{:else}
							<Money
								cents={r.type === 'income' ? r.amount : -r.amount}
								{currency}
								tone="flow"
								direction={r.type === 'income' ? 'income' : 'outcome'}
							/>
						{/if}
					</span>
				</Item.Actions>
			</a>
		{/snippet}
	</Item.Root>
</div>

<style>
	.lead {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--radius);
		background: var(--muted);
		color: var(--text);
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.sub {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		margin-top: 0.25rem;
	}

	.sub-text {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.amount-col {
		font-size: var(--font-size-base);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.inactive .amount-col {
		color: var(--text-muted);
	}
</style>
