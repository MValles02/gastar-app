<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { submitAction } from '#lib/autosave.ts';
	import IconBadge from '#lib/components/IconBadge.svelte';
	import Money from '#lib/components/Money.svelte';
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

	async function undo() {
		const r = await submitAction(`${resolve('imports')}?/undoApprove`, { id: item.id });
		if (r.type !== 'success') throw new Error('undo');
	}
</script>

<div role="listitem" class="row">
	<IconBadge
		letter={item.suggestion === null ? '?' : item.title.charAt(0).toUpperCase()}
		color={null}
		size="2.25rem"
		neutral
	/>
	<div class="text">
		<a {href} class="title" onclick={open}>{item.title}</a>
		<span class="meta" class:unknown={item.suggestion === null}>
			{item.source ? `${item.source} · ` : ''}{item.cuotas
				? `${item.cuotas.n} cuotas de ${formatMoney(item.cuotas.amount, item.currency)} · `
				: ''}{item.suggestion === null ? 'No sabemos qué es' : `${item.suggestion} · sugerido`}
		</span>
	</div>
	<div class="side">
		<span class="amount">
			<Money
				cents={item.amount}
				currency={item.currency}
				tone="flow"
				direction={item.isCredit ? 'income' : 'outcome'}
			/>
		</span>
		{#if item.suggestion === null}
			<!-- The title link is the accessible one; this shortcut only widens the touch target. -->
			<a {href} class="pill" onclick={open} aria-hidden="true" tabindex="-1">Revisar</a>
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
				<button type="submit" class="pill primary">Aprobar</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.row {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 4rem;
		padding: var(--space-2) var(--space-3) var(--space-2) var(--space-4);
	}

	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	/* The link's box stretches over the whole row so a tap anywhere opens the review. */
	.title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text);
		font-weight: 500;
		text-decoration: none;
	}

	.title::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	.title:focus-visible {
		outline: none;
	}

	.title:focus-visible::after {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
		border-radius: var(--radius-card);
	}

	.meta {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.meta.unknown {
		color: var(--warning);
	}

	.side {
		position: relative;
		display: flex;
		flex: none;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-1);
	}

	.amount {
		font-family: var(--font-display);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/* 32px pill with a 44px tap target; sits above the row's stretched link. */
	.pill {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		height: 2rem;
		padding: 0 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--text);
		font-size: var(--font-size-xs);
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
	}

	.pill::after {
		content: '';
		position: absolute;
		inset: -0.375rem -0.25rem;
	}

	.pill.primary {
		border-color: transparent;
		background: color-mix(in oklab, var(--positive) 14%, transparent);
		color: var(--positive);
		font-weight: 600;
	}

	.pill:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
</style>
