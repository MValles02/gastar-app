<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { FORM_ROUTES } from '$lib/form-routes';
	import TabBar from '$lib/components/TabBar.svelte';

	let { children }: { children: Snippet } = $props();

	const showBar = $derived(!FORM_ROUTES.has(page.route.id ?? ''));
</script>

<div class="shell">
	<main class="content" class:with-bar={showBar}>
		{@render children()}
	</main>

	{#if showBar}<TabBar />{/if}
</div>

<style>
	.shell {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.content {
		flex: 1;
		width: 100%;
		max-width: var(--content-width);
		margin-inline: auto;
		--gutter: var(--space-5);
		padding: 0 var(--gutter);
		padding-bottom: calc(var(--space-8) + 4.5rem + env(safe-area-inset-bottom));
	}

	.content.with-bar {
		padding-bottom: calc(110px + env(safe-area-inset-bottom));
	}
</style>
