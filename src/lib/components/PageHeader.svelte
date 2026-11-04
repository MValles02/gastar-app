<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Bell from '@lucide/svelte/icons/bell';
	import X from '@lucide/svelte/icons/x';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { upOnClick } from '$lib/nav-stack.svelte';

	/**
	 * Sticky top bar. Full (no `back` and no `close`; the 4 tab pages): [eyebrow + title] [avisos]
	 * [profile], the eyebrow defaulting to today's date. Little (`back` chevron or `close` X): button +
	 * one-line truncating title, no eyebrow, bell or avatar; `close` wins over `back`.
	 */
	let {
		title,
		eyebrow,
		back,
		close,
		action
	}: {
		title: string;
		eyebrow?: string;
		back?: { href: string; label: string };
		close?: { href: string; label: string };
		/** Little header only: a pill action at the right end (e.g. "Agregar"). */
		action?: Snippet;
	} = $props();

	/** Larger alert counts show as "9+". */
	const MAX_BADGE_COUNT = 9;

	const full = $derived(!back && !close);

	// From the (app) layout load; missing only if that load failed (error page).
	const header = $derived(page.data.header as { date: string; initials: string } | undefined);
	const alertCount = $derived((page.data.alertCount as number | undefined) ?? 0);
	const kicker = $derived(eyebrow ?? header?.date);
</script>

<header class="top-bar">
	{#if close}
		<Button
			class="-ml-2"
			href={close.href}
			onclick={upOnClick(close.href)}
			variant="ghost"
			size="icon"
			aria-label={close.label}
		>
			<X aria-hidden="true" />
		</Button>
	{:else if back}
		<Button
			class="-ml-2"
			href={back.href}
			onclick={upOnClick(back.href)}
			variant="ghost"
			size="icon"
			aria-label={back.label}
		>
			<ChevronLeft aria-hidden="true" />
		</Button>
	{/if}
	<div class="titles">
		{#if kicker && full}<p class="eyebrow">{kicker}</p>{/if}
		<h1 class:compact={!full}>{title}</h1>
	</div>
	{#if action && !full}{@render action()}{/if}
	{#if header && full}
		<a
			class="bell"
			href={resolve('/notifications')}
			aria-current={page.url.pathname === '/notifications' ? 'page' : undefined}
			aria-label={alertCount > 0 ? `Avisos: ${alertCount}` : 'Avisos'}
		>
			<Bell size={20} strokeWidth={1.75} aria-hidden="true" />
			{#if alertCount > 0}<Badge
					class="absolute -top-1.5 -right-1.5 min-w-5 px-1"
					aria-hidden="true"
					>{alertCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : alertCount}</Badge
				>{/if}
		</a>
		<a
			class="avatar"
			href={resolve('/profile')}
			aria-current={page.url.pathname === '/profile' ? 'page' : undefined}
			aria-label="Perfil"
		>
			<Avatar.Root class="size-full"
				><Avatar.Fallback>{header.initials}</Avatar.Fallback></Avatar.Root
			>
		</a>
	{/if}
</header>

<style>
	/* Bleeds to the content edges (--gutter from the layout) so scrolled content hides under it. */
	.top-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin: 0 calc(var(--gutter) * -1) var(--space-4);
		padding: calc(var(--space-4) + env(safe-area-inset-top)) var(--gutter) var(--space-3);
		background: color-mix(in srgb, var(--bg) 92%, transparent);
		-webkit-backdrop-filter: blur(16px);
		backdrop-filter: blur(16px);
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

	h1.compact {
		overflow: hidden;
		overflow-wrap: normal;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--font-size-base);
	}

	.bell,
	.avatar {
		position: relative;
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--tap-target);
		height: var(--tap-target);
		text-decoration: none;
		color: var(--text);
	}

	.bell {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.avatar {
		border-radius: 50%;
	}

	.bell[aria-current='page'],
	.avatar[aria-current='page'] {
		/* Neutral, so the current-page ring never reads as the primary focus ring. */
		box-shadow: 0 0 0 2px var(--border-strong);
	}
</style>
