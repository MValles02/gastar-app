<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';

	/** Centred empty message: a muted icon, one line of text, then an optional action (a button or link). */
	let {
		icon,
		text,
		action
	}: {
		icon: IconName;
		text: string;
		action?: Snippet;
	} = $props();
</script>

<div class="empty">
	<span class="icon"><Icon name={icon} size="lg" /></span>
	<p>{text}</p>
	{#if action}<div class="action">{@render action()}</div>{/if}
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-8) var(--space-4);
		text-align: center;
		text-wrap: balance;
	}

	.icon {
		display: flex;
		color: var(--text-muted);
	}

	p {
		margin: 0;
		max-width: 28rem;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.action {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-2);
	}
</style>
