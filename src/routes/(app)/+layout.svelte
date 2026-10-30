<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { FORM_ROUTES, TAB_ROUTES } from '$lib/form-routes';
	import Sheet from '$lib/components/Sheet.svelte';
	import TabBar from '$lib/components/TabBar.svelte';

	let { children }: { children: Snippet } = $props();

	const showBar = $derived(TAB_ROUTES.has(page.route.id ?? ''));
	const isSheet = $derived(FORM_ROUTES.has(page.route.id ?? ''));
</script>

{#if isSheet}
	<Sheet>{@render children()}</Sheet>
{:else}
	<div class="shell">
		<main class="content" class:with-bar={showBar}>
			{@render children()}
		</main>

		{#if showBar}<TabBar />{/if}
	</div>
{/if}

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
		padding-bottom: calc(var(--tabbar-clearance) + 1rem);
	}
</style>
