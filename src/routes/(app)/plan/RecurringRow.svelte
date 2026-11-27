<script lang="ts">
	import { resolve } from '$app/paths';
	import { openShallow } from '#lib/open-shallow.ts';
	import Amount from '#lib/components/base/Amount.svelte';
	import Row from '#lib/components/base/Row.svelte';
	import { es } from '#lib/copy/es.ts';
	import { dueTone, PLAN_CURRENCY, type RecurringStatus } from '#lib/plan.ts';
	import { withWizard } from '#lib/plan-wizard.ts';
	import type { CategoryIconKey, SwatchKey } from '#lib/appearance.ts';
	import type { Currency } from '#lib/money.ts';

	type Rule = {
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

	/** Outside the wizard a click opens the rule's drawer over the screen; in the wizard it links to the page. */
	let { row, wizard }: { row: Rule; wizard?: number } = $props();
	const r = $derived(row);
</script>

{#snippet trailing()}
	{#if r.reason}
		<Amount cents={r.amount} currency={r.currency} />
	{:else}
		<Amount
			cents={r.type === 'income' ? r.amount : -r.amount}
			currency={r.currency}
			tone={r.type === 'income' ? 'income' : 'expense'}
		/>
	{/if}
	{#if r.currency === 'USD'}
		<span class="approx">
			{#if r.converted === null}{es.plan.recurring.noRate}{:else}≈ <Amount
					cents={r.converted}
					currency={PLAN_CURRENCY}
				/>{/if}
		</span>
	{/if}
{/snippet}

<Row
	class="rule"
	href={withWizard(resolve(`plan/recurring/${r.id}`), wizard)}
	onclick={wizard ? undefined : (e) => openShallow(e, resolve(`plan/recurring/${r.id}`), 'rule')}
	glyph={{
		category:
			r.categoryIcon || r.categoryColor ? { icon: r.categoryIcon, color: r.categoryColor } : null
	}}
	title={r.description}
	{trailing}
	status={r.reason ? undefined : { tone: dueTone(r.status!), label: r.label! }}
	subtitle={es.plan.recurring.meta(r.day, r.reason ?? r.accountName)}
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
