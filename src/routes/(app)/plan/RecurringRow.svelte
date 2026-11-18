<script lang="ts">
	import { resolve } from '$app/paths';
	import ListRow from '#lib/components/ListRow.svelte';
	import Money from '#lib/components/Money.svelte';
	import { dueTone, PLAN_CURRENCY, type RecurringStatus } from '#lib/plan.ts';
	import { withWizard } from '#lib/plan-wizard.ts';
	import type { CategoryIconKey, SwatchKey } from '#lib/appearance.ts';
	import type { Currency } from '#lib/money.ts';

	type Row = {
		id: string;
		type: string;
		description: string;
		amount: number;
		currency: Currency;
		/** Amount in plan pesos for a USD rule; null for an ARS rule or when there is no rate. */
		converted: number | null;
		accountName: string;
		day: number;
		categoryIcon: CategoryIconKey | null;
		categoryColor: SwatchKey | null;
	} & (
		| { status: RecurringStatus; label: string; reason?: undefined }
		| { reason: string; status?: undefined; label?: undefined }
	);

	let { row, wizard }: { row: Row; wizard?: number } = $props();
	const r = $derived(row);
</script>

{#snippet value()}
	{#if r.reason}
		<Money cents={r.amount} currency={r.currency} />
	{:else}
		<Money
			cents={r.type === 'income' ? r.amount : -r.amount}
			currency={r.currency}
			tone="flow"
			direction={r.type === 'income' ? 'income' : 'outcome'}
		/>
	{/if}
	{#if r.currency === 'USD'}
		<span class="approx">
			{#if r.converted === null}Sin cotización{:else}≈ <Money
					cents={r.converted}
					currency={PLAN_CURRENCY}
				/>{/if}
		</span>
	{/if}
{/snippet}

{#snippet meta()}Día {r.day} · {r.reason ?? r.accountName}{/snippet}

<ListRow
	class="rule"
	href={withWizard(resolve(`plan/recurring/${r.id}`), wizard)}
	lead={{
		icon: r.categoryIcon ?? undefined,
		letter: r.categoryIcon ? undefined : r.description.charAt(0).toUpperCase(),
		color: r.categoryColor
	}}
	title={r.description}
	{value}
	status={r.reason ? undefined : { tone: dueTone(r.status!), label: r.label! }}
	{meta}
	dimmed={!!r.reason}
/>

<style>
	.approx {
		margin-left: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: 400;
		color: var(--text-muted);
	}
</style>
