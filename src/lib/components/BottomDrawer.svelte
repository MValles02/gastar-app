<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	import { drawers } from '$lib/drawer-open.svelte';
	import * as Drawer from '$lib/components/ui/drawer/index.js';

	let {
		title,
		open = $bindable(false),
		onclose,
		nested = false,
		hideTitle = false,
		bare = false,
		children
	}: {
		title: string;
		open?: boolean;
		onclose?: () => void;
		/** Stacks over the drawer this one is rendered inside (vaul nested drawer): the one below stays put. */
		nested?: boolean;
		/** Keeps the title for assistive technology only. */
		hideTitle?: boolean;
		/** No padded scroll wrapper: the children lay out the content themselves (e.g. sticky actions). */
		bare?: boolean;
		children: Snippet;
	} = $props();

	$effect(() => {
		if (!open) return;
		drawers.open++;
		return () => drawers.open--;
	});
</script>

{#snippet content()}
	<!-- A tap on a toast (Deshacer) is not an outside tap: it must not close the drawer. -->
	<Drawer.Content
		class="mx-auto w-full max-w-[35rem]"
		onInteractOutside={(e) => {
			if ((e.target as Element | null)?.closest?.('[data-sonner-toast]')) e.preventDefault();
		}}
	>
		<Drawer.Title
			class={hideTitle ? 'sr-only' : 'px-5 pt-1 pb-3 text-lg leading-snug font-semibold'}
			>{title}</Drawer.Title
		>
		{#if bare}
			{@render children()}
		{:else}
			<div class="min-h-0 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
				{@render children()}
			</div>
		{/if}
	</Drawer.Content>
{/snippet}

<!-- No close button: the scrim, a swipe down or Escape close it. The content hugs its height (capped in Drawer.Content). -->
{#if nested}
	<DrawerPrimitive.NestedRoot
		bind:open
		shouldScaleBackground={false}
		onOpenChange={(o) => !o && onclose?.()}
	>
		{@render content()}
	</DrawerPrimitive.NestedRoot>
{:else}
	<Drawer.Root bind:open shouldScaleBackground={false} onClose={() => onclose?.()}>
		{@render content()}
	</Drawer.Root>
{/if}
