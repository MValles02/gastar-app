<script lang="ts">
	import { getContext, setContext, untrack, type Snippet } from 'svelte';
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	import { drawers } from '#lib/drawer-open.svelte.ts';
	import X from '@lucide/svelte/icons/x';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import { buttonVariants } from '#lib/components/ui/button/index.js';

	// A drawer rendered inside another one (its content, or a component in it) stacks over it.
	const IN_DRAWER = Symbol.for('bottom-drawer');
	const insideDrawer = getContext<boolean | undefined>(IN_DRAWER) ?? false;
	setContext(IN_DRAWER, true);

	let {
		title,
		open = $bindable(false),
		onclose,
		onclosed,
		nested = insideDrawer,
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
		/** Stacks over the drawer this one is rendered inside (vaul nested drawer): the one below stays put. Default: whether it is inside one. */
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

	// vaul's repositionInputs is off: on every keyboard resize it writes an inline height/bottom and, on close,
	// restores a stale height (our drawers hug their content), so the drawer jumped. Instead lift it by the
	// keyboard inset (iOS only: Android Chrome resizes the layout itself, interactive-widget=resizes-content in
	// app.html, so the inset stays 0 there). `translate`, not `transform` (vaul drags with transform), animated
	// with WAAPI because vaul writes an inline `transition` that would drop a CSS one.
	$effect(() => {
		const vv = window.visualViewport;
		const el = drawerEl;
		if (!open || !vv || !el) return;
		let inset = 0;
		const update = () => {
			const next = Math.round(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
			if (next === inset) return;
			const from = getComputedStyle(el).translate;
			inset = next;
			el.style.setProperty('--kb-inset', `${next}px`);
			el.style.translate = `0 ${-next}px`;
			if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
				el.animate([{ translate: from === 'none' ? '0 0' : from }, { translate: `0 ${-next}px` }], {
					duration: 250,
					easing: 'cubic-bezier(0.32, 0.72, 0, 1)'
				});
		};
		update();
		vv.addEventListener('resize', update);
		vv.addEventListener('scroll', update);
		return () => {
			vv.removeEventListener('resize', update);
			vv.removeEventListener('scroll', update);
			el.style.removeProperty('--kb-inset');
			el.style.removeProperty('translate');
		};
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
		class="mx-auto w-full max-w-[35rem] data-[vaul-drawer-direction=bottom]:max-h-[calc(85dvh-var(--kb-inset,0px))]"
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
		repositionInputs={false}
		shouldScaleBackground={false}
		onOpenChange={(o) => !o && onclose?.()}
	>
		{@render content()}
	</DrawerPrimitive.NestedRoot>
{:else}
	<Drawer.Root
		bind:open
		repositionInputs={false}
		shouldScaleBackground={false}
		onClose={() => onclose?.()}
	>
		{@render content()}
	</Drawer.Root>
{/if}
