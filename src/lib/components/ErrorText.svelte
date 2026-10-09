<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	// Inline alert for auth form errors (field-level when `id` is the input's aria-describedby).
	let { message, id }: { message: string; id?: string } = $props();
</script>

<p class="error" {id} role="alert"><Icon name="alert" size="1rem" />{message}</p>

<style>
	.error {
		margin: 0;
		display: flex;
		align-items: flex-start;
		gap: var(--space-1);
		font-size: var(--font-size-sm);
		color: var(--negative);
	}

	.error :global(svg) {
		flex: none;
		margin-top: 0.1rem;
	}
</style>
