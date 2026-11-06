<script lang="ts">
	import { onMount, type Component, type Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { stripFlags } from '$lib/nav-stack.svelte';
	import { edgeSwipeBack, settleEdgeSwipe } from '$lib/edge-swipe-back';
	import { TAB_ROUTES } from '$lib/form-routes';
	import TabBar from '$lib/components/TabBar.svelte';
	import { highlightMovement } from '$lib/highlight.svelte';
	import { undoMovementSaved } from '$lib/undo-toast';

	let { children }: { children: Snippet } = $props();

	// Drawers are client-only (shallow routing), so they load on demand and are prefetched at idle:
	// opening one whose module has resolved renders synchronously.
	const loaders = {
		newMovement: () => import('$lib/components/NewMovementDrawer.svelte'),
		movement: () => import('$lib/components/MovementDetailDrawer.svelte'),
		newRule: () => import('$lib/components/NewRuleDrawer.svelte'),
		limit: () => import('$lib/components/LimitDetail.svelte'),
		newLimit: () => import('$lib/components/NewLimitDrawer.svelte'),
		newAccount: () => import('$lib/components/NewAccountDrawer.svelte'),
		newCategory: () => import('$lib/components/NewCategoryDrawer.svelte'),
		password: () => import('$lib/components/PasswordDrawer.svelte'),
		deleteAccount: () => import('$lib/components/DeleteAccountDrawer.svelte'),
		importItem: () => import('$lib/components/ImportItemDrawer.svelte'),
		savings: () => import('$lib/components/SavingsDrawer.svelte'),
		registerRule: () => import('$lib/components/RegisterRuleDrawer.svelte')
	};
	type DrawerKey = keyof typeof loaders;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let C = $state<Partial<Record<DrawerKey, Component<any>>>>({});
	const requested: Partial<Record<DrawerKey, true>> = {};
	function load(key: DrawerKey) {
		if (requested[key]) return;
		requested[key] = true;
		void loaders[key]().then((m) => (C[key] = m.default));
	}
	const keys = Object.keys(loaders) as DrawerKey[];
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
		stripFlags(['movementSaved', 'rule']);
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
	{#if page.state.newMovement && C.newMovement}<C.newMovement data={page.state.newMovement} />{/if}
	{#if page.state.movement && C.movement}<C.movement data={page.state.movement} />{/if}
	{#if page.state.newRule && C.newRule}<C.newRule data={page.state.newRule} />{/if}
	{#if page.state.limit && C.limit}<C.limit
			data={page.state.limit}
			variant="drawer"
			onclose={() => page.state.limit && history.back()}
		/>{/if}
	{#if page.state.newLimit && C.newLimit}<C.newLimit data={page.state.newLimit} />{/if}
	{#if page.state.newAccount && C.newAccount}<C.newAccount />{/if}
	{#if page.state.newCategory && C.newCategory}<C.newCategory />{/if}
	{#if page.state.password && C.password}<C.password />{/if}
	{#if page.state.deleteAccount && C.deleteAccount}<C.deleteAccount
			summary={page.state.deleteAccount.summary}
		/>{/if}
	{#if page.state.importItem && C.importItem}<C.importItem data={page.state.importItem} />{/if}
	{#if page.state.savings && C.savings}<C.savings data={page.state.savings} />{/if}
	{#if page.state.registerRule && C.registerRule}<C.registerRule
			data={page.state.registerRule}
		/>{/if}
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
