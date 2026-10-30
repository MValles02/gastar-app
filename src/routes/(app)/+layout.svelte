<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { stripFlags } from '$lib/nav-stack.svelte';
	import { FORM_ROUTES, TAB_ROUTES } from '$lib/form-routes';
	import Sheet from '$lib/components/Sheet.svelte';
	import TabBar from '$lib/components/TabBar.svelte';

	let { children }: { children: Snippet } = $props();

	const showBar = $derived(TAB_ROUTES.has(page.route.id ?? ''));
	const isSheet = $derived(FORM_ROUTES.has(page.route.id ?? ''));

	// Saving a new movement returns to the screen it was opened from with ?movementSaved=1: toast
	// once, with a shortcut to add another from the same screen, then strip the flag so a reload does
	// not toast again. Without JavaScript the server-rendered status stands in until hydration.
	const newMovementHref = resolve('/movements/new');
	const movementSaved = $derived(page.url.searchParams.get('movementSaved') === '1');
	let hydrated = $state(false);
	onMount(() => (hydrated = true));
	afterNavigate(() => {
		if (!movementSaved) return;
		toast.success('Movimiento guardado.', {
			action: { label: 'Agregar otro', onClick: () => goto(newMovementHref) }
		});
		stripFlags(['movementSaved']);
	});
</script>

{#if isSheet}
	<Sheet>{@render children()}</Sheet>
{:else}
	<div class="shell">
		<main class="content" class:with-bar={showBar}>
			{#if movementSaved && !hydrated}
				<p role="status" class="saved">
					Movimiento guardado. <a href={newMovementHref}>Agregar otro</a>
				</p>
			{/if}
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

	.saved {
		margin-block: var(--space-3);
	}

	.content.with-bar {
		padding-bottom: calc(var(--tabbar-clearance) + 1rem);
	}
</style>
