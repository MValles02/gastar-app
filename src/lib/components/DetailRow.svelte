<script lang="ts">
	import { appear } from '#lib/motion.ts';
	import type { Snippet } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	/**
	 * One `DetailCard` row: the label left, the value right. With `onclick` the whole row is a button
	 * that opens a drawer (chevron after the value) and `error` shows below it.
	 */
	let {
		label,
		onclick,
		error,
		children
	}: { label: string; onclick?: () => void; error?: string; children: Snippet } = $props();
</script>

{#if onclick}
	<li>
		<button type="button" class="row pick" aria-haspopup="dialog" {onclick}>
			<span class="k">{label}</span>
			<span class="v glyph">
				{@render children()}
				<ChevronRight
					size={16}
					strokeWidth={1.75}
					aria-hidden="true"
					class="text-muted-foreground"
				/>
			</span>
		</button>
		{#if error}<p class="error" role="alert" in:appear>{error}</p>{/if}
	</li>
{:else}
	<li class="row">
		<span class="k">{label}</span>
		<span class="v">{@render children()}</span>
	</li>
{/if}

<style>
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-base);
	}

	.pick {
		width: 100%;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.v {
		min-width: 0;
		text-align: right;
		font-weight: 500;
	}

	.glyph {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	.error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		padding: 0 var(--space-4) var(--space-3);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
