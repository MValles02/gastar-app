<script lang="ts">
	import type { Snippet } from 'svelte';

	let { maxWidth, children }: { maxWidth?: string; children: Snippet } = $props();
</script>

<div class="card" style:max-width={maxWidth}>
	{@render children()}
</div>

<style>
	.card {
		width: 100%;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: var(--space-6) var(--space-5);
	}
</style>
