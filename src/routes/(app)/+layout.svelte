<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { stripFlags } from '$lib/nav-stack.svelte';
	import { TAB_ROUTES } from '$lib/form-routes';
	import TabBar from '$lib/components/TabBar.svelte';
	import MovementDetailDrawer from '$lib/components/MovementDetailDrawer.svelte';
	import NewMovementDrawer from '$lib/components/NewMovementDrawer.svelte';
	import NewRuleDrawer from '$lib/components/NewRuleDrawer.svelte';
	import LimitDetail from '$lib/components/LimitDetail.svelte';
	import NewAccountDrawer from '$lib/components/NewAccountDrawer.svelte';
	import NewCategoryDrawer from '$lib/components/NewCategoryDrawer.svelte';
	import NewLimitDrawer from '$lib/components/NewLimitDrawer.svelte';
	import PasswordDrawer from '$lib/components/PasswordDrawer.svelte';
	import DeleteAccountDrawer from '$lib/components/DeleteAccountDrawer.svelte';
	import SavingsDrawer from '$lib/components/SavingsDrawer.svelte';
	import { highlightMovement } from '$lib/highlight.svelte';
	import { undoMovementSaved } from '$lib/undo-toast';

	let { children }: { children: Snippet } = $props();

	const showBar = $derived(TAB_ROUTES.has(page.route.id ?? ''));
	// Saving a new movement returns to the screen it was opened from with ?movementSaved=<id>: toast
	// once (Deshacer deletes it), then strip the flag so a reload does not toast again. Without
	// JavaScript the server-rendered status stands in until hydration.
	const movementSaved = $derived(page.url.searchParams.get('movementSaved'));
	let hydrated = $state(false);
	onMount(() => (hydrated = true));
	let toasted: string | null = null;
	afterNavigate(() => {
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
	<main class="content" class:with-bar={showBar}>
		{#if movementSaved && !hydrated}
			<p role="status" class="saved">Movimiento guardado.</p>
		{/if}
		{@render children()}
	</main>

	{#if showBar}<TabBar />{/if}
	{#if page.state.newMovement}<NewMovementDrawer data={page.state.newMovement} />{/if}
	{#if page.state.movement}<MovementDetailDrawer data={page.state.movement} />{/if}
	{#if page.state.newRule}<NewRuleDrawer data={page.state.newRule} />{/if}
	{#if page.state.limit}<LimitDetail
			data={page.state.limit}
			variant="drawer"
			onclose={() => page.state.limit && history.back()}
		/>{/if}
	{#if page.state.newLimit}<NewLimitDrawer data={page.state.newLimit} />{/if}
	{#if page.state.newAccount}<NewAccountDrawer />{/if}
	{#if page.state.newCategory}<NewCategoryDrawer />{/if}
	{#if page.state.password}<PasswordDrawer />{/if}
	{#if page.state.deleteAccount}<DeleteAccountDrawer
			summary={page.state.deleteAccount.summary}
		/>{/if}
	{#if page.state.savings}<SavingsDrawer data={page.state.savings} />{/if}
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
