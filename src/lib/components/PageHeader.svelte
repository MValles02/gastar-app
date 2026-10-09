<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Bell from '@lucide/svelte/icons/bell';
	import X from '@lucide/svelte/icons/x';

	/**
	 * Sticky top bar: [back] [eyebrow + title] [avisos] [profile]. The eyebrow defaults to today's date.
	 * `compact` drops the eyebrow and shrinks the title; `close` shows an X instead of back, hides the
	 * bell and avatar, is always compact and wins over `back`.
	 * `collapse` (Inicio) compacts the large header after 24px of scroll: no eyebrow, a centered 16px title.
	 */
	let {
		title,
		eyebrow,
		back,
		variant = 'large',
		close,
		collapse = false
	}: {
		title: string;
		eyebrow?: string;
		back?: { href: string; label: string };
		variant?: 'large' | 'compact';
		close?: { href: string; label: string };
		collapse?: boolean;
	} = $props();

	const COLLAPSE_AFTER_PX = 24;
	/** Larger alert counts show as "9+". */
	const MAX_BADGE_COUNT = 9;

	let scrollY = $state(0);
	const collapsed = $derived(
		collapse && !close && !back && variant === 'large' && scrollY > COLLAPSE_AFTER_PX
	);

	const compact = $derived(variant === 'compact' || !!close);

	// From the (app) layout load; missing only if that load failed (error page).
	const header = $derived(page.data.header as { date: string; initials: string } | undefined);
	const alertCount = $derived((page.data.alertCount as number | undefined) ?? 0);
	const kicker = $derived(eyebrow ?? header?.date);
</script>

<svelte:window bind:scrollY />

<header class="top-bar" class:collapsed>
	{#if collapsed}
		<!-- Mirrors the bell and avatar so the title stays centered. -->
		<span class="spacer" aria-hidden="true"></span>
	{/if}
	{#if close}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass an already resolved href -->
		<a class="back" href={close.href} aria-label={close.label}>
			<X size={24} strokeWidth={1.75} aria-hidden="true" />
		</a>
	{:else if back}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass an already resolved href -->
		<a class="back" href={back.href} aria-label={back.label}>
			<ChevronLeft size={24} strokeWidth={1.75} aria-hidden="true" />
		</a>
	{/if}
	<div class="titles">
		{#if kicker && !compact}<p class="eyebrow">{kicker}</p>{/if}
		<h1 class:compact>{title}</h1>
	</div>
	{#if header && !close}
		<a
			class="bell"
			href={resolve('/notifications')}
			aria-current={page.url.pathname === '/notifications' ? 'page' : undefined}
			aria-label={alertCount > 0 ? `Avisos: ${alertCount}` : 'Avisos'}
		>
			<Bell size={20} strokeWidth={1.75} aria-hidden="true" />
			{#if alertCount > 0}<span class="badge" aria-hidden="true"
					>{alertCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : alertCount}</span
				>{/if}
		</a>
		<a
			class="avatar"
			href={resolve('/profile')}
			aria-current={page.url.pathname === '/profile' ? 'page' : undefined}
			aria-label="Perfil">{header.initials}</a
		>
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
		border-bottom: 1px solid transparent;
	}

	/* Sticky only with room to spare: `em` here is the browser's text size, so large text or zoom turns it off (WCAG 2.4.11, 1.4.10). */
	@media (min-height: 40em) {
		.top-bar {
			position: sticky;
			top: 0;
			z-index: 9;
		}

		/* Hairline appears once the page scrolls under the bar. */
		@supports (animation-timeline: scroll()) {
			.top-bar {
				animation: edge linear both;
				animation-timeline: scroll();
				animation-range: 0 2rem;
			}

			@keyframes edge {
				to {
					border-bottom-color: var(--border);
				}
			}
		}
	}

	.spacer {
		display: none;
	}

	/* Only while the bar is pinned: a static bar scrolls away with the page. */
	@media (min-height: 40em) {
		.collapsed .spacer {
			display: block;
			flex: none;
			width: 5.5rem;
		}

		.collapsed .eyebrow {
			display: none;
		}

		.collapsed .titles {
			text-align: center;
		}

		.collapsed h1 {
			overflow: hidden;
			overflow-wrap: normal;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: var(--font-size-base);
		}

		.collapsed {
			border-bottom-color: var(--border);
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
		font-size: 1.0625rem;
	}

	.back,
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

	.back {
		margin-left: calc(var(--space-2) * -1);
		border-radius: var(--radius-pill);
	}

	@media (hover: hover) {
		.back:hover {
			background: color-mix(in srgb, var(--primary) 8%, transparent);
		}
	}

	.bell {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	/* The count as text (capped at 9+); the link's aria-label carries it for screen readers. */
	.badge {
		position: absolute;
		top: -0.3125rem;
		right: -0.3125rem;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 var(--space-1);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		background: var(--primary);
		color: var(--on-primary);
		font-size: var(--font-size-xs);
		font-weight: 600;
		line-height: 1;
	}

	.avatar {
		border-radius: 50%;
		background: var(--muted);
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.bell[aria-current='page'],
	.avatar[aria-current='page'] {
		/* Neutral, so the current-page ring never reads as the primary focus ring. */
		box-shadow: 0 0 0 2px var(--border-strong);
	}
</style>
