<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/Icon.svelte';

	let { children }: { children: Snippet } = $props();

	const navItems = [
		{ href: resolve('/'), path: '/', label: 'Inicio', icon: 'home' as const },
		{ href: resolve('/accounts'), path: '/accounts', label: 'Cuentas', icon: 'accounts' as const },
		{
			href: resolve('/movements'),
			path: '/movements',
			label: 'Movimientos',
			icon: 'movements' as const
		},
		{
			href: resolve('/categories'),
			path: '/categories',
			label: 'Categorías',
			icon: 'categories' as const
		}
	];
	const newMovementHref = resolve('/movements/new');

	function isActive(path: string): boolean {
		const pathname = page.url.pathname;
		if (path === '/') return pathname === '/';
		if (path === '/movements' && pathname === '/movements/new') return false;
		return pathname === path || pathname.startsWith(`${path}/`);
	}
</script>

<div class="shell">
	<main class="content">
		{@render children()}
	</main>

	<nav class="bottom-nav" aria-label="Navegación principal">
		{#each navItems.slice(0, 2) as item (item.href)}
			<a href={item.href} class="nav-item" aria-current={isActive(item.path) ? 'page' : undefined}>
				<Icon name={item.icon} />
				<span>{item.label}</span>
			</a>
		{/each}

		<a
			href={newMovementHref}
			class="nav-fab"
			aria-label="Nuevo movimiento"
			aria-current={page.url.pathname === '/movements/new' ? 'page' : undefined}
		>
			<Icon name="plus" />
		</a>

		{#each navItems.slice(2) as item (item.href)}
			<a href={item.href} class="nav-item" aria-current={isActive(item.path) ? 'page' : undefined}>
				<Icon name={item.icon} />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.shell {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.content {
		flex: 1;
		width: 100%;
		max-width: var(--content-width);
		margin-inline: auto;
		--gutter: var(--space-5);
		padding: 0 var(--gutter);
		padding-bottom: calc(var(--space-8) + 4.5rem + env(safe-area-inset-bottom));
	}

	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-around;
		gap: 0;
		background: color-mix(in srgb, var(--bg) 92%, transparent);
		backdrop-filter: blur(12px);
		border-top: 1px solid var(--border);
		padding: var(--space-2) 0;
		padding-inline: max(0px, calc((100% - var(--content-width)) / 2 + var(--space-5)));
		padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom));
	}

	.nav-item {
		flex: 1 1 0;
		min-width: 0;
		min-height: 2.75rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		font-size: var(--font-size-xs);
		font-weight: 500;
		text-decoration: none;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.nav-item span {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (max-width: 22rem) {
		.nav-item {
			font-size: 0.6875rem;
		}
	}

	.nav-item:hover,
	.nav-item[aria-current='page'] {
		color: var(--text);
	}

	.nav-item[aria-current='page'] :global(svg) {
		color: var(--primary);
	}

	.nav-fab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.25rem;
		height: 3.25rem;
		flex: 0 0 auto;
		text-decoration: none;
		border-radius: var(--radius-card);
		background: var(--primary);
		color: var(--on-primary);
		box-shadow: var(--shadow-lift);
		transition: opacity 0.15s ease;
	}

	.nav-fab:hover {
		opacity: 0.9;
	}

	@media (prefers-reduced-motion: no-preference) {
		.nav-fab {
			transition-property: opacity, color, background-color, transform;
		}

		.nav-item {
			transition:
				color 0.15s ease,
				transform 0.15s ease;
		}
	}

	.nav-item:active,
	.nav-fab:active {
		transform: scale(0.96);
	}
</style>
