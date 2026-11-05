<script lang="ts">
	import type { Snippet } from 'svelte';
	import ActionLink from './ActionLink.svelte';

	/**
	 * Heading of a section inside a screen: a 13px/600 muted h2/h3 with an optional `aside` (a group
	 * total or a "+ Agregar" link) at the right of the same line. `action` sits on its own line.
	 * `variant="group"` (currency and kind groups) is the same heading, always an h2.
	 */
	let {
		title,
		id,
		level = 2,
		variant = 'title',
		action,
		aside
	}: {
		title: string;
		id?: string;
		level?: 2 | 3;
		variant?: 'title' | 'group';
		action?: { href: string; label?: string; onclick?: (e: MouseEvent) => void };
		aside?: Snippet;
	} = $props();

	const tag = $derived(`h${variant === 'group' ? 2 : level}`);
</script>

<div class="section-head" class:has-action={!!action}>
	<svelte:element this={tag} {id} class="title">{title}</svelte:element>
	{#if aside}{@render aside()}{/if}
	{#if action}<span class="action"
			><ActionLink href={action.href} label={action.label} onclick={action.onclick} /></span
		>{/if}
</div>

<style>
	.section-head {
		display: flex;
		/* The heading line stays one line (the title ellipsizes); only `action` goes on its own line. */
		flex-wrap: nowrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0 var(--space-2);
		margin-bottom: var(--space-1);
		padding-inline: var(--space-1);
		min-width: 0;
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.has-action {
		flex-wrap: wrap;
	}

	.section-head > :global(:not(.action)) {
		min-width: 0;
	}

	.title {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.action {
		flex-basis: 100%;
	}
</style>
