<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/Icon.svelte';
	import Wordmark from '$lib/components/Wordmark.svelte';

	let { children } = $props();

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
	const profileHref = resolve('/profile');

	function isActive(path: string): boolean {
		const pathname = page.url.pathname;
		if (path === '/') return pathname === '/';
		if (path === '/movements' && pathname === '/movements/new') return false;
		return pathname === path || pathname.startsWith(`${path}/`);
	}
</script>

<div class="shell">
	<header class="topbar">
		<Wordmark />
		<a href={profileHref} class="profile-link" aria-label="Perfil">
			<Icon name="profile" />
		</a>
	</header>

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
		display: flex;
		flex-direction: column;
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}

	.profile-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		text-decoration: none;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		transition: background-color 0.15s ease;
	}

	.profile-link:hover {
		background: color-mix(in srgb, var(--primary) 10%, transparent);
	}

	.content {
		flex: 1;
		width: 100%;
		max-width: 560px;
		margin-inline: auto;
		padding: var(--space-5);
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
		background: var(--surface);
		border-top: 1px solid var(--border);
		padding: var(--space-2) 0;
		padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom));
		max-width: 560px;
		margin-inline: auto;
	}

	.nav-item {
		flex: 1 1 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		font-size: 0.75rem;
		text-decoration: none;
		color: var(--text-muted);
		padding: var(--space-1) 0;
		white-space: nowrap;
		border-radius: var(--radius-pill);
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
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

	.nav-item:hover {
		color: var(--text);
	}

	.nav-item[aria-current='page'] {
		color: var(--primary);
		background: color-mix(in srgb, var(--primary) 10%, transparent);
	}

	.nav-fab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.5rem;
		height: 3.5rem;
		aspect-ratio: 1;
		flex: 0 0 auto;
		text-decoration: none;
		border-radius: var(--radius-pill);
		background: var(--primary);
		color: var(--on-primary);
		margin-top: -1.5rem;
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
		transition: opacity 0.15s ease;
	}

	.nav-fab:hover {
		opacity: 0.9;
	}

	@media (prefers-reduced-motion: no-preference) {
		.profile-link,
		.nav-item,
		.nav-fab {
			transition-property: opacity, color, background-color, transform;
		}
	}

	.profile-link:active,
	.nav-item:active,
	.nav-fab:active {
		transform: scale(0.96);
	}
</style>
