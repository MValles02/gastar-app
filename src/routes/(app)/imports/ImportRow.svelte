<script lang="ts">
	import Row from '#lib/components/base/Row.svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { submitAction } from '#lib/autosave.ts';
	import Amount from '#lib/components/base/Amount.svelte';
	import RowPill from '#lib/components/RowPill.svelte';
	import { formatMoney, type Currency } from '#lib/money.ts';
	import { openShallow } from '#lib/open-shallow.ts';
	import { undoToast } from '#lib/undo-toast.ts';

	/**
	 * One pending imported item. The whole row opens its review; a suggested row also has a quick
	 * "Aprobar" (with Deshacer) and an unknown one a "Revisar" shortcut to the same review.
	 */
	let {
		item
	}: {
		item: {
			id: string;
			title: string;
			amount: number;
			currency: Currency;
			isCredit: boolean;
			suggestion: string | null;
			/** Where it came from, only when the inbox mixes sources. */
			source: string | null;
			/** Installment purchase: how many cuotas and the fixed payment amount of each. */
			cuotas: { n: number; amount: number } | null;
		};
	} = $props();

	const href = $derived(resolve(`imports/${item.id}`));
	const open = (e: MouseEvent) => openShallow(e, href, 'importItem');
	// Where it came from and the cuotas; the suggestion (or its absence) is the status pill.
	const meta = $derived(
		[
			item.source,
			item.cuotas && `${item.cuotas.n} cuotas de ${formatMoney(item.cuotas.amount, item.currency)}`
		]
			.filter(Boolean)
			.join(' · ')
	);

	async function undo() {
		const r = await submitAction(`${resolve('imports')}?/undoApprove`, { id: item.id });
		if (r.type !== 'success') throw new Error('undo');
	}
</script>

{#snippet metaLine()}{meta}{/snippet}

{#snippet side()}
	<span class="amount">
		<Amount
			cents={item.amount}
			currency={item.currency}
			tone={item.isCredit ? 'income' : 'expense'}
		/>
	</span>
	{#if item.suggestion === null}
		<!-- The title link is the accessible one; this shortcut only widens the touch target. -->
		<RowPill {href} onclick={open} label="Revisar" hidden />
	{:else}
		<form
			method="POST"
			action="?/approveOne"
			use:enhance={() =>
				async ({ result, update }) => {
					if (result.type === 'success') {
						undoToast('Movimiento aprobado.', undo);
						await update();
					} else if (result.type === 'failure') {
						toast.error(
							(result.data as { message?: string } | undefined)?.message ?? 'No se pudo aprobar.'
						);
						await update();
					} else {
						toast.error('No se pudo aprobar.');
					}
				}}
		>
			<input type="hidden" name="id" value={item.id} />
			<RowPill label="Aprobar" positive />
		</form>
	{/if}
{/snippet}

<Row
	{href}
	onclick={open}
	glyph={{ category: item.suggestion === null ? null : { icon: null, color: null } }}
	title={item.title}
	status={item.suggestion === null
		? { tone: 'warning', label: 'No sabemos qué es' }
		: { tone: 'ok', label: `${item.suggestion} · sugerido` }}
	subtitle={meta ? metaLine : undefined}
	stacked
	action={side}
/>

<style>
	.amount {
		font-family: var(--font-display);
		font-size: var(--font-size-base);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
