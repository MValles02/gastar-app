<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, action }: { title: string; action?: Snippet } = $props();
</script>

{#if action}
	<div class="header">
		<h1>{title}</h1>
		{@render action()}
	</div>
{:else}
	<h1>{title}</h1>
{/if}

<style>
	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2) var(--space-3);
		margin-bottom: var(--space-5);
	}

	.header h1 {
		margin-bottom: 0;
	}

	h1 {
		font-size: var(--font-size-xl);
		font-weight: 500;
		line-height: 1.2;
		margin-bottom: var(--space-5);
	}
</style>
