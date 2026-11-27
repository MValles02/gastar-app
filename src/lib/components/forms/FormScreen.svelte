<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import Sheet from '#lib/components/base/Sheet.svelte';
	import Header from '#lib/components/base/Header.svelte';
	import { es } from '#lib/copy/es.ts';
	import { setFormScreen } from './form-enhance.ts';

	/**
	 * A form route's one screen: the full page (`<svelte:head>` + header) or, with `onclose`, the
	 * bottom drawer over the screen it was opened from, or, with `bind:open` too, a sub-task drawer stacked
	 * over the form it feeds (it stacks by itself: Sheet nests inside another drawer). Shares `variant`, `onclose`, `onsaved` and the
	 * close target with the form inside it (FormShell reads them as defaults).
	 */
	let {
		title,
		headTitle,
		close,
		back,
		onclose,
		onsaved,
		open = $bindable(true),
		drawerProps,
		children
	}: {
		title: string;
		/** The page's `<title>` when it is not `title`. */
		headTitle?: string;
		/** Page: X button in the header; also Cancelar's target. */
		close?: { href: string; label?: string };
		/** Page: "‹ Parent" link instead of the X (`close` wins). */
		back?: { href: string; label: string };
		/** Set: render as a drawer (the (app) layout passes it); closes it. */
		onclose?: () => void;
		/** Drawer: the action redirected to `location`. */
		onsaved?: (location: string) => unknown;
		/** Drawer: bound by a sub-task drawer the parent opens and closes itself (`onclose` sets it false). */
		open?: boolean;
		/** Sheet options where they differ from the page (another `title`, `hideTitle`, `bare`). */
		drawerProps?: Partial<Omit<ComponentProps<typeof Sheet>, 'children' | 'open' | 'onclose'>>;
		children: Snippet;
	} = $props();

	setFormScreen({
		get variant() {
			return onclose ? 'drawer' : 'page';
		},
		get cancelHref() {
			return close?.href;
		},
		get onclose() {
			return onclose;
		},
		get onsaved() {
			return onsaved;
		}
	});
</script>

<svelte:head>
	{#if !onclose}<title>{es.ui.docTitle(headTitle ?? title)}</title>{/if}
</svelte:head>

{#if onclose}
	<Sheet {title} {...drawerProps} bind:open {onclose}>
		{@render children()}
	</Sheet>
{:else}
	<Header {title} close={close && { label: es.ui.close, ...close }} {back} />
	{@render children()}
{/if}
