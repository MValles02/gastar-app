<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Icon from './Icon.svelte';

	/** Sticky top bar: [back] [eyebrow + title] [avisos] [profile]. The eyebrow defaults to today's date. */
	let {
		title,
		eyebrow,
		back
	}: {
		title: string;
		eyebrow?: string;
		back?: { href: string; label: string };
	} = $props();

	// From the (app) layout load; missing only if that load failed (error page).
	const header = $derived(page.data.header as { date: string; initials: string } | undefined);
	const alertCount = $derived((page.data.alertCount as number | undefined) ?? 0);
	const kicker = $derived(eyebrow ?? header?.date);
</script>

<header class="top-bar">
	{#if back}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass an already resolved href -->
		<a class="back" href={back.href} aria-label={back.label}>
			<Icon name="chevron-left" />
		</a>
	{/if}
	<div class="titles">
		{#if kicker}<p class="eyebrow">{kicker}</p>{/if}
		<h1>{title}</h1>
	</div>
	{#if header}
		<a
			class="bell"
			href={resolve('/notifications')}
			aria-current={page.url.pathname === '/notifications' ? 'page' : undefined}
			aria-label={alertCount > 0 ? `Avisos: ${alertCount}` : 'Avisos'}
		>
			<Icon name="bell" size="1.25rem" />
			{#if alertCount > 0}<span class="badge" aria-hidden="true"
					>{alertCount > 9 ? '9+' : alertCount}</span
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
		backdrop-filter: blur(12px);
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
		font-size: var(--font-size-xl);
		font-weight: 500;
		line-height: 1.2;
	}

	.back,
	.bell,
	.avatar {
		position: relative;
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
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
		padding: 0 0.25rem;
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
		box-shadow: 0 0 0 2px var(--primary);
	}
</style>
