<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	// Centered, narrow column shared by the signed-out form pages; optional screen-corner back link and title.
	let { children, backHref, title }: { children: Snippet; backHref?: string; title?: string } =
		$props();
</script>

<main class="page">
	{#if backHref}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass a resolved href -->
		<a class="back" href={backHref}>
			<Icon name="chevron-left" size="1.25rem" /><span class="visually-hidden"
				>Volver a Ingresar</span
			>
		</a>
	{/if}
	{#if title}
		<h1>{title}</h1>
	{/if}
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

	.back {
		position: absolute;
		top: max(var(--space-2), env(safe-area-inset-top));
		left: max(var(--space-2), env(safe-area-inset-left));
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		color: var(--text);
	}

	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--font-size-xl);
		font-weight: 500;
		line-height: 1.15;
		letter-spacing: -0.01em;
	}
</style>
