<script lang="ts">
	import { onMount, type Component, type Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { stripFlags } from '$lib/nav-stack.svelte';
	import { edgeSwipeBack, settleEdgeSwipe } from '$lib/edge-swipe-back';
	import { TAB_ROUTES } from '$lib/form-routes';
	import { drawers, type DrawerKey } from './drawers';
	import TabBar from '$lib/components/TabBar.svelte';
	import { highlightMovement } from '$lib/highlight.svelte';
	import { undoMovementSaved } from '$lib/undo-toast';

	let { children }: { children: Snippet } = $props();

	// Drawers are client-only (shallow routing), so they load on demand and are prefetched at idle:
	// opening one whose module has resolved renders synchronously.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let C = $state<Partial<Record<DrawerKey, Component<any>>>>({});
	const requested: Partial<Record<DrawerKey, true>> = {};
	function load(key: DrawerKey) {
		if (requested[key]) return;
		requested[key] = true;
		void drawers[key]().then((m) => (C[key] = m.default));
	}
	const keys = Object.keys(drawers) as DrawerKey[];
	$effect(() => {
		for (const key of keys) if (page.state[key]) load(key);
	});

	const showBar = $derived(TAB_ROUTES.has(page.route.id ?? ''));
	// Saving a new movement returns to the screen it was opened from with ?movementSaved=<id>: toast
	// once (Deshacer deletes it), then strip the flag so a reload does not toast again. Without
	// JavaScript the server-rendered status stands in until hydration.
	const movementSaved = $derived(page.url.searchParams.get('movementSaved'));
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
		const prefetch = () => keys.forEach(load);
		if ('requestIdleCallback' in window) {
			const id = requestIdleCallback(prefetch);
			return () => cancelIdleCallback(id);
		}
		const id = setTimeout(prefetch, 2000);
		return () => clearTimeout(id);
	});
	let toasted: string | null = null;
	afterNavigate(() => {
		settleEdgeSwipe();
		if (!movementSaved) return;
		// Once per saved id, however many navigations land before the flag is stripped.
		if (movementSaved !== toasted) {
			toasted = movementSaved;
			if (/^[0-9a-f-]{36}$/.test(movementSaved))
				undoMovementSaved(movementSaved, page.url.searchParams.get('rule'));
			else toast.success('Movimiento guardado.');
			highlightMovement(movementSaved);
		}
		void stripFlags();
	});
</script>

<div class="shell">
	<main class="content" class:with-bar={showBar} use:edgeSwipeBack>
		{#if movementSaved && !hydrated}
			<p role="status" class="saved">Movimiento guardado.</p>
		{/if}
		{@render children()}
	</main>

	{#if showBar}<TabBar />{/if}
	{#each keys as key (key)}
		{@const Drawer = C[key]}
		{#if page.state[key] && Drawer}
			<!-- Every drawer's history entry goes away with the back gesture, its close controls, the scrim or Escape. -->
			<Drawer data={page.state[key]} onclose={() => page.state[key] && history.back()} />
		{/if}
	{/each}
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

	.saved {
		margin-block: var(--space-3);
	}

	.content.with-bar {
		padding-bottom: calc(var(--tabbar-clearance) + 1rem);
	}
</style>
