<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<ul class="card">{@render children()}</ul>

<style>
	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--card-edge);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}
</style>
