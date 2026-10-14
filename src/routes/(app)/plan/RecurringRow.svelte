<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Clock from '@lucide/svelte/icons/clock';
	import { resolve } from '$app/paths';
	import * as Item from '$lib/components/ui/item/index.js';
	import Money from '$lib/components/Money.svelte';
	import type { Currency } from '$lib/money';

	// Row pill by due status: paid is green, today is orange, overdue is inverted (never red).
	const dueIcon = { paid: Check, today: Clock, overdue: CircleAlert, upcoming: null } as const;
	const dueClass = { paid: 'ok', today: 'warn', overdue: 'over', upcoming: '' } as const;

	type Row = {
		id: string;
		type: string;
		description: string;
		amount: number;
		accountName: string;
		day: number;
	} & (
		| { status: keyof typeof dueIcon; label: string; reason?: undefined }
		| { reason: string; status?: undefined; label?: undefined }
	);

	let { row, currency, wizard }: { row: Row; currency: Currency; wizard?: number } = $props();
	const r = $derived(row);
	const DueIcon = $derived(r.status ? dueIcon[r.status] : null);
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
								<span class="pill">{r.reason}</span>
							{:else}
								<span class="pill {dueClass[r.status!]}">
									{#if DueIcon}<DueIcon size={14} strokeWidth={2} />{/if}{r.label}
								</span>
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
								kind={r.type === 'income' ? 'income' : 'outcome'}
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

	.pill {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.625rem;
		border-radius: var(--radius-pill);
		background: var(--muted);
		color: var(--text-muted);
		font-size: var(--font-size-xs);
		font-weight: 600;
		white-space: nowrap;
	}

	.pill.ok {
		background: color-mix(in srgb, var(--positive) 14%, transparent);
		color: var(--positive);
	}

	.pill.warn {
		background: color-mix(in srgb, var(--swatch-orange) 14%, transparent);
		color: var(--swatch-orange);
	}

	/* Overdue is information, not an error: inverted fill, never red. */
	.pill.over {
		background: var(--text);
		color: var(--bg);
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
