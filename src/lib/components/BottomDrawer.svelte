<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	import { drawers } from '#lib/drawer-open.svelte.ts';
	import X from '@lucide/svelte/icons/x';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import { buttonVariants } from '#lib/components/ui/button/index.js';

	let {
		title,
		open = $bindable(false),
		onclose,
		onclosed,
		nested = false,
		hideTitle = false,
		bare = false,
		initialFocus,
		children
	}: {
		title: string;
		open?: boolean;
		onclose?: () => void;
		/** Runs once the close animation has ended (focus is back on the trigger by then). */
		onclosed?: () => void;
		/** Stacks over the drawer this one is rendered inside (vaul nested drawer): the one below stays put. */
		nested?: boolean;
		/** Keeps the title for assistive technology only. */
		hideTitle?: boolean;
		/** No padded scroll wrapper: the children lay out the content themselves (e.g. sticky actions). */
		bare?: boolean;
		/** CSS selector of the element inside the drawer to focus when it opens (default: the dialog's own choice). */
		initialFocus?: string;
		children: Snippet;
	} = $props();

	// vaul's close animation (TRANSITIONS.DURATION = 0.5s, not exported); bits-ui returns focus to the
	// trigger as the content unmounts, which is before this ends.
	const CLOSE_MS = 500;
	let drawerEl = $state<HTMLElement | null>(null);
	let wasOpen = false;
	// `onclosed` fires once per open -> closed change, whoever closed it (vaul's own onAnimationEnd only
	// runs for closes it handles itself, not when the parent sets `open`). Reopening cancels it.
	$effect(() => {
		if (open) {
			wasOpen = true;
			return;
		}
		if (!wasOpen) return;
		wasOpen = false;
		const timer = setTimeout(() => onclosed?.(), CLOSE_MS);
		return () => clearTimeout(timer);
	});

	// untrack: the effect must depend on `open` only, not on the counter it writes.
	$effect(() => {
		if (!open) return;
		untrack(() => drawers.open++);
		return () => untrack(() => drawers.open--);
	});
</script>

{#snippet content()}
	<!-- A tap on a toast (Deshacer) is not an outside tap: it must not close the drawer. -->
	<Drawer.Content
		class="mx-auto w-full max-w-[35rem]"
		bind:ref={drawerEl}
		onOpenAutoFocus={(e) => {
			if (!initialFocus) return;
			e.preventDefault();
			requestAnimationFrame(() =>
				drawerEl?.querySelector<HTMLElement>(initialFocus)?.focus({ preventScroll: true })
			);
		}}
		onInteractOutside={(e) => {
			if ((e.target as Element | null)?.closest?.('[data-sonner-toast]')) e.preventDefault();
		}}
	>
		<div class="flex items-start">
			<Drawer.Title
				class={hideTitle
					? 'sr-only'
					: 'min-w-0 flex-1 px-5 pt-1 pb-3 text-lg leading-snug font-semibold'}
				>{title}</Drawer.Title
			>
			<Drawer.Close
				aria-label="Cerrar"
				class={buttonVariants({
					variant: 'ghost',
					size: 'icon',
					class: 'text-muted-foreground mr-2 -mt-2 -mb-1 ml-auto size-11 shrink-0'
				})}
			>
				<X size={20} strokeWidth={1.75} aria-hidden="true" />
			</Drawer.Close>
		</div>
		{#if bare}
			{@render children()}
		{:else}
			<div class="min-h-0 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
				{@render children()}
			</div>
		{/if}
	</Drawer.Content>
{/snippet}

<!-- Closes through the X button, the scrim, a swipe down or Escape (all fire onclose). The content hugs its height (capped in Drawer.Content). -->
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
