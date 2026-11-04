<script lang="ts">
	import type { Snippet } from 'svelte';
	import ActionLink from './ActionLink.svelte';
	import CardEyebrow from './CardEyebrow.svelte';

	/** Heading of a section: `title` (large) or `group` (eyebrow). `action` sits on its own line, `aside` on the heading line. */
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
</script>

<div class="section-head" class:group={variant === 'group'} class:has-action={!!action}>
	{#if variant === 'group'}
		<CardEyebrow as="h2" {id}>{title}</CardEyebrow>
	{:else}
		<svelte:element this={`h${level}`} {id} class="title">{title}</svelte:element>
	{/if}
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
		margin-bottom: var(--space-2);
		min-width: 0;
	}

	.has-action {
		flex-wrap: wrap;
	}

	.section-head > :global(:not(.action)) {
		min-width: 0;
	}

	.group {
		padding-inline: var(--space-1);
	}

	.title {
		font-size: var(--font-size-lg);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.action {
		flex-basis: 100%;
	}
</style>
