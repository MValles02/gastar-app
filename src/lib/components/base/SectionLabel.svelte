<script lang="ts">
	import type { Snippet } from 'svelte';
	import ActionLink from '#lib/components/ActionLink.svelte';

	/**
	 * Label of a section: a small uppercase muted line (h2 by default) with an optional `aside` (a
	 * group total or a "+ Agregar" link) at the right of the same line. `action` sits on its own line.
	 */
	let {
		text,
		as = 'h2',
		id,
		aside,
		action
	}: {
		text: string;
		as?: 'h2' | 'h3' | 'p' | 'dt' | 'span';
		id?: string;
		aside?: Snippet;
		action?: { href: string; label?: string; onclick?: (e: MouseEvent) => void };
	} = $props();
</script>

{#if aside || action}
	<div class="section-label" class:has-action={!!action}>
		<svelte:element this={as} {id} class="text">{text}</svelte:element>
		{#if aside}{@render aside()}{/if}
		{#if action}<span class="action"
				><ActionLink href={action.href} label={action.label} onclick={action.onclick} /></span
			>{/if}
	</div>
{:else}
	<!-- Alone (a card's eyebrow): no wrapper, so a `dt` stays a direct child of its `dl`. -->
	<svelte:element this={as} {id} class="text">{text}</svelte:element>
{/if}

<style>
	.section-label {
		display: flex;
		/* The label line stays one line (the text ellipsizes); only `action` goes on its own line. */
		flex-wrap: nowrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0 var(--space-2);
		margin-bottom: var(--space-1);
		padding-inline: var(--space-1);
		min-width: 0;
	}

	.has-action {
		flex-wrap: wrap;
	}

	.section-label > :global(:not(.action)) {
		min-width: 0;
	}

	.text {
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: var(--tracking-label);
		text-transform: uppercase;
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.action {
		flex-basis: 100%;
	}
</style>
