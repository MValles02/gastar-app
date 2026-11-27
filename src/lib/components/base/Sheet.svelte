<script lang="ts">
	import { getContext, setContext, untrack, type Snippet } from 'svelte';
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	import { DRAWER_CLOSE_MS, SHEET_KEYBOARD_MS } from '#lib/constants.ts';
	import { drawers } from '#lib/drawer-open.svelte.ts';
	import { es } from '#lib/copy/es.ts';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import CircleButton from '#lib/components/base/CircleButton.svelte';
	import Header from '#lib/components/base/Header.svelte';

	// A sheet rendered inside another one (its content, or a component in it) stacks over it.
	const IN_SHEET = Symbol.for('sheet');
	const insideSheet = getContext<boolean | undefined>(IN_SHEET) ?? false;
	setContext(IN_SHEET, true);

	let {
		title,
		open = $bindable(false),
		onclose,
		onclosed,
		nested = insideSheet,
		variant = 'auto',
		hideTitle = false,
		bare = false,
		initialFocus,
		footer,
		children
	}: {
		title: string;
		open?: boolean;
		onclose?: () => void;
		/** Runs once the close animation has ended (focus is back on the trigger by then). */
		onclosed?: () => void;
		/** Stacks over the sheet this one is rendered inside (vaul nested drawer): the one below stays put. Default: whether it is inside one. */
		nested?: boolean;
		/** `auto` hugs its content (capped); `tall` is a fixed tall sheet. */
		variant?: 'auto' | 'tall';
		/** Keeps the title for assistive technology only. */
		hideTitle?: boolean;
		/** No padded scroll wrapper: the children lay out the content themselves (e.g. sticky actions). */
		bare?: boolean;
		/** CSS selector of the element inside the sheet to focus when it opens (default: the dialog's own choice). */
		initialFocus?: string;
		/** Pinned below the scrolling body (the filter sheets' Limpiar / Ver N buttons). */
		footer?: Snippet;
		children: Snippet;
	} = $props();

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
		const timer = setTimeout(() => onclosed?.(), DRAWER_CLOSE_MS);
		return () => clearTimeout(timer);
	});

	// vaul's repositionInputs is off: on every keyboard resize it writes an inline height/bottom and, on close,
	// restores a stale height (our sheets hug their content), so the sheet jumped. Instead lift it by the
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
					duration: SHEET_KEYBOARD_MS,
					easing: getComputedStyle(el).getPropertyValue('--ease-drawer')
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

{#snippet heading(text: string)}
	<Drawer.Title class={hideTitle ? 'sr-only' : 'title'}>{text}</Drawer.Title>
{/snippet}

{#snippet close()}
	<Drawer.Close>
		{#snippet child({ props })}
			<CircleButton {...props} icon="close" tone="ghost" label={es.ui.close} />
		{/snippet}
	</Drawer.Close>
{/snippet}

{#snippet content()}
	<!-- A tap on a toast (Deshacer) is not an outside tap: it must not close the sheet. -->
	<Drawer.Content
		class="sheet"
		data-variant={variant}
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
		<Header variant="sheet" {title} {heading} end={close} />
		{#if bare}
			{@render children()}
		{:else}
			<div class="body" class:with-footer={!!footer}>
				{@render children()}
			</div>
		{/if}
		{#if footer}<div class="footer">{@render footer()}</div>{/if}
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

<style>
	:global(.sheet) {
		width: 100%;
		max-width: var(--size-sheet);
		margin-inline: auto;
	}

	:global(.sheet[data-vaul-drawer-direction='bottom'][data-variant='auto']) {
		max-height: calc(var(--size-sheet-auto) - var(--kb-inset, 0px));
	}

	:global(.sheet[data-vaul-drawer-direction='bottom'][data-variant='tall']) {
		height: calc(var(--size-sheet-tall) - var(--kb-inset, 0px));
		max-height: none;
	}

	:global(.sheet .title) {
		font-size: var(--font-size-lg);
		font-weight: 600;
		line-height: 1.25;
	}

	.body {
		min-height: 0;
		overflow-y: auto;
		padding: 0 var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
	}

	.body.with-footer {
		padding-bottom: var(--space-4);
	}

	.footer {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--popover);
	}

	.footer > :global(*) {
		flex: 1 1 0;
		min-width: 0;
	}

	.footer > :global(.wide) {
		flex-grow: 2;
	}
</style>
