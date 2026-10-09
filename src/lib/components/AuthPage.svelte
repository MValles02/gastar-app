<script lang="ts">
	import type { Snippet } from 'svelte';

	// Centered, narrow column shared by the signed-out form pages.
	let { children }: { children: Snippet } = $props();
</script>

<main class="page">
	{@render children()}
</main>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100vh;
		min-height: 100dvh;
		width: 100%;
		max-width: 400px;
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: var(--space-5);
		padding: max(var(--space-5), env(safe-area-inset-top))
			max(var(--space-5), env(safe-area-inset-right))
			max(var(--space-5), env(safe-area-inset-bottom))
			max(var(--space-5), env(safe-area-inset-left));
	}
</style>
