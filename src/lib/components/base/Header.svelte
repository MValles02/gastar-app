<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import CircleButton from '#lib/components/base/CircleButton.svelte';
	import { es } from '#lib/copy/es.ts';
	import { MAX_BADGE_COUNT } from '#lib/constants.ts';
	import { upOnClick } from '#lib/nav-stack.svelte.ts';

	/**
	 * Sticky top bar. Home (no `back`, no `close`; the 4 tab pages): [eyebrow + title] [avisos]
	 * [profile], the eyebrow defaulting to today's date. Page with `back`: a round chevron on its own
	 * row above the full-size title (and `action`). Page with `close`: round X + one-line title; `close`
	 * wins over `back`. Sheet: [start] [centred heading] [end] (`heading` replaces the default h2).
	 */
	let {
		variant = 'page',
		title,
		eyebrow,
		back,
		close,
		action,
		tone = 'default',
		ref = $bindable(),
		heading,
		start,
		end
	}: {
		variant?: 'page' | 'home' | 'sheet';
		title: string;
		eyebrow?: string;
		back?: { href: string; label: string };
		close?: { href: string; label: string };
		/** `back` or `close` header only: a pill action at the right end (e.g. "Agregar"). */
		action?: Snippet;
		/** `primary`: solid primary bar with on-primary content (joined by a band below it). */
		tone?: 'default' | 'primary';
		/** The `<header>` element, for a page that measures it (bind:ref). */
		ref?: HTMLElement;
		heading?: Snippet<[string]>;
		start?: Snippet;
		end?: Snippet;
	} = $props();

	const home = $derived(variant === 'home' || (variant === 'page' && !back && !close));

	// From the (app) layout load; missing only if that load failed (error page).
	const header = $derived(page.data.header);
	const alertCount = $derived(page.data.alertCount ?? 0);
	const kicker = $derived(eyebrow ?? header?.date);
	const barTone = $derived(tone === 'primary' ? 'on-primary' : 'surface');
</script>

{#if variant === 'sheet'}
	<header class="top-bar sheet" bind:this={ref}>
		<div class="start">
			{#if start}{@render start()}{/if}
		</div>
		{#if heading}{@render heading(title)}{:else}<h2>{title}</h2>{/if}
		<div class="end">
			{#if end}{@render end()}{/if}
		</div>
	</header>
{:else}
	<header
		bind:this={ref}
		class="top-bar"
		class:stacked={back && !close}
		class:primary={tone === 'primary'}
	>
		{#if close}
			<CircleButton
				icon="close"
				tone="ghost"
				href={close.href}
				label={close.label}
				data-edge-back
				onclick={upOnClick(close.href)}
			/>
		{:else if back}
			<div class="back-row">
				<CircleButton
					icon="chevron-left"
					tone="ghost"
					href={back.href}
					label={back.label}
					data-edge-back
					onclick={upOnClick(back.href)}
				/>
			</div>
		{/if}
		<div class="titles">
			{#if kicker && home}<p class="eyebrow">{kicker}</p>{/if}
			<h1 class:compact={!!close}>{title}</h1>
		</div>
		{#if action && !home}{@render action()}{/if}
		{#if header && home}
			<CircleButton
				icon="bell"
				tone={barTone}
				href={resolve('notifications')}
				label={alertCount > 0 ? es.ui.alertsCount(alertCount) : es.ui.alerts}
				badge={alertCount > 0
					? alertCount > MAX_BADGE_COUNT
						? es.ui.badgeOverflow(MAX_BADGE_COUNT)
						: alertCount
					: undefined}
				aria-current={page.url.pathname === '/notifications' ? 'page' : undefined}
			/>
			<a
				class="avatar"
				href={resolve('profile')}
				aria-current={page.url.pathname === '/profile' ? 'page' : undefined}
				aria-label={es.ui.profile}
			>
				<Avatar.Root class="size-full"
					><Avatar.Fallback>{header.initials}</Avatar.Fallback></Avatar.Root
				>
			</a>
		{/if}
	</header>
{/if}

<style>
	/* Bleeds to the content edges (--gutter from the layout) so scrolled content hides under it. */
	.top-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin: 0 calc(var(--gutter) * -1) var(--space-4);
		padding: calc(var(--space-4) + env(safe-area-inset-top)) var(--gutter) var(--space-3);
		background: color-mix(in srgb, var(--bg) var(--tint-header), transparent);
		-webkit-backdrop-filter: var(--backdrop-header);
		backdrop-filter: var(--backdrop-header);
		/* Crossfades in place while the page underneath slides (page transitions, app.css). */
		view-transition-name: page-header;
	}

	/* Sticky only with room to spare: `em` here is the browser's text size, so large text or zoom turns it off (WCAG 2.4.11, 1.4.10). */
	@media (min-height: 40em) {
		.top-bar {
			position: sticky;
			top: 0;
			z-index: 9;
		}
	}

	.top-bar.sheet {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		margin: 0;
		padding: var(--space-3) var(--space-4);
		background: transparent;
		-webkit-backdrop-filter: none;
		backdrop-filter: none;
		view-transition-name: none;
		position: static;
	}

	.sheet :global(h2) {
		font-size: var(--font-size-base);
		font-weight: 600;
		text-align: center;
	}

	.sheet .end {
		display: flex;
		justify-content: flex-end;
	}

	/* Wraps below the buttons at large text instead of breaking the title per character. */
	.titles {
		flex: 1 1 4rem;
		min-width: min(100%, 7rem);
	}

	.eyebrow {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	h1 {
		overflow-wrap: anywhere;
		font-family: var(--font-display);
		font-size: var(--font-size-xl);
		font-weight: 500;
		letter-spacing: -0.015em;
		line-height: 1.2;
	}

	.top-bar.primary {
		background: var(--primary);
		color: var(--on-primary);
		margin-bottom: 0;
		-webkit-backdrop-filter: none;
		backdrop-filter: none;
	}

	.primary .eyebrow {
		color: var(--on-primary);
	}

	.top-bar.stacked {
		row-gap: var(--space-1);
		padding-top: calc(var(--space-3) + env(safe-area-inset-top));
	}

	.back-row {
		flex: 0 0 100%;
	}

	h1.compact {
		overflow: hidden;
		overflow-wrap: normal;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--font-size-base);
	}

	.avatar {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--size-control);
		height: var(--size-control);
		border-radius: 50%;
		text-decoration: none;
		color: var(--text);
	}

	.avatar[aria-current='page'] {
		/* Neutral, so the current-page ring never reads as the primary focus ring. */
		box-shadow: 0 0 0 2px var(--border-strong);
	}
</style>
