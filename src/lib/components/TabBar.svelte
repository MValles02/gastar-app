<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { markReplace } from '$lib/nav-stack.svelte';
	import { openShallow } from '$lib/open-shallow';
	import House from '@lucide/svelte/icons/house';
	import List from '@lucide/svelte/icons/list';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Plus from '@lucide/svelte/icons/plus';

	const navItems = [
		{ href: resolve('/'), path: '/', label: 'Inicio', icon: House },
		{ href: resolve('/movements'), path: '/movements', label: 'Movimientos', icon: List },
		{ href: resolve('/plan'), path: '/plan', label: 'Plan', icon: CalendarCheck },
		{ href: resolve('/reports'), path: '/reports', label: 'Reportes', icon: ChartColumn }
	];
	const newMovementHref = resolve('/movements/new');

	function isActive(path: string): boolean {
		const pathname = page.url.pathname;
		if (path === '/') return pathname === '/';
		if (path === '/movements' && pathname === '/movements/new') return false;
		return pathname === path || pathname.startsWith(`${path}/`);
	}
</script>

<nav aria-label="Navegación principal">
	<div class="tabs">
		{#each navItems as item (item.href)}
			<a
				href={item.href}
				class="tab"
				data-sveltekit-replacestate
				onclick={markReplace}
				aria-label={item.label}
				title={item.label}
				aria-current={isActive(item.path) ? 'page' : undefined}
			>
				<item.icon size={24} strokeWidth={1.75} aria-hidden="true" />
			</a>
		{/each}
	</div>

	<a
		href={newMovementHref}
		class="fab"
		onclick={(e) => openShallow(e, newMovementHref, 'newMovement')}
		aria-label="Nuevo movimiento"
	>
		<Plus size={24} strokeWidth={1.75} aria-hidden="true" />
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
		background: color-mix(in srgb, var(--card) 62%, transparent);
		-webkit-backdrop-filter: blur(20px) saturate(180%);
		backdrop-filter: blur(20px) saturate(180%);
		box-shadow:
			inset 0 0 0 1px light-dark(rgb(255 255 255 / 0.6), rgb(255 255 255 / 0.08)),
			inset 0 1px 0 light-dark(rgb(255 255 255 / 0.9), rgb(255 255 255 / 0.12)),
			0 10px 30px -10px light-dark(rgb(60 45 20 / 0.35), rgb(0 0 0 / 0.6));
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
				color var(--ease-fast),
				background-color var(--ease-fast),
				transform var(--ease-fast);
		}
	}

	.tab:active,
	.fab:active {
		transform: scale(0.96);
	}
</style>
