<script lang="ts">
	import { resolve } from '$app/paths';
	import ListRow from '$lib/components/ListRow.svelte';
	import Money from '$lib/components/Money.svelte';
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

{#snippet value()}
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
{/snippet}

{#snippet meta()}Día {r.day} · {r.accountName}{/snippet}

<!-- Each row opens the detail, where "Registrar pago" lives. -->
<ListRow
	class="rule"
	href={resolve(`/plan/recurring/${r.id}${wizard ? `?wizard=${wizard}` : ''}`)}
	lead={{ letter: r.description.charAt(0).toUpperCase(), color: null }}
	title={r.description}
	{value}
	status={r.reason
		? { tone: 'neutral', label: r.reason }
		: { tone: DUE_TONE[r.status!], label: r.label! }}
	{meta}
	dimmed={!!r.reason}
/>
