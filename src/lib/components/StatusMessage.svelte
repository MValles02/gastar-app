<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	// Full-screen centered state (icon badge + heading) for auth outcomes; children follow the heading.
	let {
		icon,
		title,
		children
	}: { icon: ComponentProps<typeof Icon>['name']; title: string; children: Snippet } = $props();
</script>

<main class="msg">
	<span class="icon" aria-hidden="true"><Icon name={icon} size="1.75rem" /></span>
	<h1>{title}</h1>
	{@render children()}
</main>

<style>
	.msg {
		min-height: 100vh;
		min-height: 100dvh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: var(--space-3);
		padding: var(--space-5);
	}

	.icon {
		display: grid;
		place-items: center;
		width: 4rem;
		height: 4rem;
		border-radius: 999px;
		background: var(--muted);
		color: var(--text);
		margin-bottom: var(--space-2);
	}

	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.875rem;
		font-weight: 500;
		line-height: 1.15;
		letter-spacing: -0.01em;
	}
</style>
