<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let { icon, children }: { icon: ComponentProps<typeof Icon>['name']; children: Snippet } =
		$props();
</script>

<div class="empty">
	<span class="badge"><Icon name={icon} /></span>
	<p>{@render children()}</p>
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-8) var(--space-5);
		text-align: center;
		color: var(--text-muted);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: var(--radius-pill);
		background: color-mix(in srgb, var(--primary) 8%, transparent);
		color: var(--primary);
	}
</style>
