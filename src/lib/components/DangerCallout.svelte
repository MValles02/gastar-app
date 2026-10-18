<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	/** Irreversible-action warning: negative-tone outline, alert icon and text. */
	let { children }: { children: Snippet } = $props();
</script>

<div class="danger" role="note">
	<span class="icon"><Icon name="alert" size="1.25rem" /></span>
	<p>{@render children()}</p>
</div>

<style>
	.danger {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-4);
		border: 1px solid var(--negative);
		border-radius: var(--radius-card);
		background: var(--surface);
	}

	.icon {
		display: inline-flex;
		flex: none;
		color: var(--negative);
	}
</style>
