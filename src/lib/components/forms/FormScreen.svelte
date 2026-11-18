<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { setFormScreen } from './form-enhance.ts';

	/**
	 * A form route's one screen: the full page (`<svelte:head>` + header) or, with `onclose`, the
	 * bottom drawer over the screen it was opened from. Shares `variant`, `onclose`, `onsaved` and the
	 * close target with the form inside it (FormShell reads them as defaults).
	 */
	let {
		title,
		headTitle,
		close,
		back,
		onclose,
		onsaved,
		drawerProps,
		children
	}: {
		title: string;
		/** The page's `<title>` when it is not `title`. */
		headTitle?: string;
		/** Page: X button in the header; also Cancelar's target. */
		close?: { href: string; label?: string };
		/** Page: "‹ Parent" link instead of the X (`close` wins). */
		back?: { href: string; label: string; text: string };
		/** Set: render as a drawer (the (app) layout passes it); closes it. */
		onclose?: () => void;
		/** Drawer: the action redirected to `location`. */
		onsaved?: (location: string) => unknown;
		/** BottomDrawer options where they differ from the page (another `title`, `hideTitle`, `bare`). */
		drawerProps?: Partial<
			Omit<ComponentProps<typeof BottomDrawer>, 'children' | 'open' | 'onclose'>
		>;
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
	{#if !onclose}<title>{headTitle ?? title} · Gastar</title>{/if}
</svelte:head>

{#if onclose}
	<BottomDrawer {title} {...drawerProps} open {onclose}>
		{@render children()}
	</BottomDrawer>
{:else}
	<PageHeader {title} close={close && { label: 'Cerrar', ...close }} {back} />
	{@render children()}
{/if}
