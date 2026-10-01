<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		error,
		errorId,
		children
	}: { label: string; error?: string; errorId?: string; children: Snippet } = $props();
</script>

<div class="field">
	<label>
		{label}
		{@render children()}
	</label>
	{#if error}
		<p class="error" id={errorId} role="alert">{error}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
