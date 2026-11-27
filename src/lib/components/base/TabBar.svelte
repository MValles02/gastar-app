<script lang="ts">
	import { NEW_MOVEMENT_PATH } from '#lib/movement.ts';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { es } from '#lib/copy/es.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { markReplace } from '#lib/nav-stack.svelte.ts';
	import { openShallow } from '#lib/open-shallow.ts';

	/** Floating glass tab bar: the four main screens plus the "Nuevo movimiento" button. */
	const navItems = [
		{ href: resolve(''), path: '/', label: es.ui.tabs.home, icon: 'home' },
		{
			href: resolve('movements'),
			path: '/movements',
			label: es.ui.tabs.movements,
			icon: 'movements'
		},
		{ href: resolve('plan'), path: '/plan', label: es.ui.tabs.plan, icon: 'plan' },
		{ href: resolve('reports'), path: '/reports', label: es.ui.tabs.reports, icon: 'chart' }
	] as const;
	const newMovementHref = resolve('movements/new');

	function isActive(path: string): boolean {
		const pathname = page.url.pathname;
		if (path === '/') return pathname === '/';
		if (path === '/movements' && pathname === NEW_MOVEMENT_PATH) return false;
		return pathname === path || pathname.startsWith(`${path}/`);
	}
</script>

<nav aria-label={es.ui.mainNav}>
	<div class="tabs">
		{#each navItems as item (item.href)}
			<a
				href={item.href}
				class="tab"
				data-tab-link
				data-sveltekit-replacestate
				onclick={markReplace}
				aria-label={item.label}
				title={item.label}
				aria-current={isActive(item.path) ? 'page' : undefined}
			>
				<Icon name={item.icon} size="lg" />
			</a>
		{/each}
	</div>

	<a
		href={newMovementHref}
		class="fab"
		onclick={(e) => openShallow(e, newMovementHref, 'newMovement')}
		aria-label={es.ui.newMovement}
	>
		<Icon name="plus" size="lg" />
	</a>
</nav>

<style>
	nav {
		position: fixed;
		inset-inline: var(--space-4);
		bottom: var(--tabbar-bottom);
		max-width: var(--content-width);
		margin-inline: auto;
		display: flex;
		gap: var(--space-3);
		align-items: center;
		z-index: 10;
		/* Stays put while the page underneath slides (page transitions, app.css). */
		view-transition-name: tab-bar;
	}

	.tabs {
		flex: 1;
		min-width: 0;
		display: flex;
		height: var(--tabbar-height);
		padding: var(--space-1);
		border-radius: var(--radius-pill);
		background: color-mix(in srgb, var(--card) var(--tint-glass), transparent);
		-webkit-backdrop-filter: var(--backdrop-glass);
		backdrop-filter: var(--backdrop-glass);
		box-shadow: var(--shadow-glass);
	}

	@media (prefers-reduced-transparency: reduce) {
		.tabs {
			background: var(--card);
			-webkit-backdrop-filter: none;
			backdrop-filter: none;
		}
	}

	@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
		.tabs {
			background: var(--card);
		}
	}

	.tab {
		flex: 1 1 auto;
		min-width: 0;
		min-height: var(--tap-target);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		text-decoration: none;
		color: var(--text-muted);
	}

	.tab[aria-current='page'] {
		background: var(--muted);
		color: var(--text);
	}

	.tab[aria-current='page'] :global(svg) {
		color: var(--primary);
	}

	.fab {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--tabbar-height);
		height: var(--tabbar-height);
		border-radius: 50%;
		background: var(--primary);
		color: var(--on-primary);
		text-decoration: none;
		box-shadow: var(--shadow-lift);
	}

	@media (prefers-reduced-motion: no-preference) {
		.tab,
		.fab {
			transition:
				color var(--dur-fast) var(--ease-out),
				background-color var(--dur-fast) var(--ease-out),
				transform var(--dur-fast) var(--ease-out);
		}
	}

	.tab:active,
	.fab:active {
		transform: scale(0.96);
	}
</style>
