<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { CircleUser, House, List, Plus, Tag, Wallet } from '@lucide/svelte';

	let { children } = $props();

	const navItems = [
		{ href: resolve('/'), path: '/', label: 'Inicio', icon: House },
		{ href: resolve('/accounts'), path: '/accounts', label: 'Cuentas', icon: Wallet },
		{ href: resolve('/movements'), path: '/movements', label: 'Movimientos', icon: List },
		{ href: resolve('/categories'), path: '/categories', label: 'Categorías', icon: Tag }
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
		<span class="app-name">Gastar</span>
		<a href={profileHref} class="profile-link" aria-label="Perfil">
			<CircleUser size={24} />
		</a>
	</header>

	<main class="content">
		{@render children()}
	</main>

	<nav class="bottom-nav" aria-label="Navegación principal">
		{#each navItems.slice(0, 2) as item (item.href)}
			<a href={item.href} class="nav-item" aria-current={isActive(item.path) ? 'page' : undefined}>
				<item.icon size={22} />
				<span>{item.label}</span>
			</a>
		{/each}

		<a
			href={newMovementHref}
			class="nav-fab"
			aria-label="Nuevo movimiento"
			aria-current={page.url.pathname === '/movements/new' ? 'page' : undefined}
		>
			<Plus size={24} />
		</a>

		{#each navItems.slice(2) as item (item.href)}
			<a href={item.href} class="nav-item" aria-current={isActive(item.path) ? 'page' : undefined}>
				<item.icon size={22} />
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

	.app-name {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--primary);
	}

	.profile-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--radius-pill);
		color: var(--text);
	}

	.profile-link:hover {
		background: var(--bg);
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
		gap: var(--space-2);
		background: var(--surface);
		border-top: 1px solid var(--border);
		padding: var(--space-2) var(--space-3);
		padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom));
		max-width: 560px;
		margin-inline: auto;
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		font-size: 0.75rem;
		color: var(--text-muted);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius);
	}

	.nav-item[aria-current='page'] {
		color: var(--primary);
	}

	.nav-fab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: var(--radius-pill);
		background: var(--primary);
		color: var(--on-primary);
		margin-top: -1.5rem;
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
	}

	.nav-fab:hover {
		opacity: 0.9;
	}
</style>
