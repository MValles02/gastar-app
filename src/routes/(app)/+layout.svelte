<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import TabBar from '$lib/components/TabBar.svelte';

	let { children }: { children: Snippet } = $props();

	// Forms and the plan setup flow hide the tab bar and the new-movement button.
	const FORM_ROUTES = new Set([
		'/(app)/movements/new',
		'/(app)/movements/[id]/edit',
		'/(app)/accounts/new',
		'/(app)/accounts/[id]/edit',
		'/(app)/categories/new',
		'/(app)/categories/[id]/edit',
		'/(app)/plan/recurring/new',
		'/(app)/plan/setup'
	]);
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
