<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import type { LayoutData } from './$types';
	import Icon from '$lib/components/Icon.svelte';
	import Wordmark from '$lib/components/Wordmark.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let selected = $derived(data.currency as string);
	let currencyForm: HTMLFormElement;
	let currencyError = $state('');

	const currencyOptions = [
		{ value: 'ARS', label: 'ARS' },
		{ value: 'USD', label: 'USD' },
		{ value: 'both', label: 'Ambas' }
	];

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
		<div class="topbar-grid">
			<Wordmark />
			<form
				method="POST"
				action="/currency"
				class="currency-form"
				bind:this={currencyForm}
				use:enhance={() => {
					currencyError = '';
					return async ({ result, update }) => {
						if (result.type === 'failure') {
							// update() only applies the result on the action's own route, so keep it locally.
							currencyError = (result.data?.currencyError as string | undefined) ?? '';
						} else if (result.type === 'redirect') {
							// eslint-disable-next-line svelte/no-navigation-without-resolve -- server-validated same-origin redirect location
							await goto(result.location, { invalidateAll: true, keepFocus: true, noScroll: true });
							document.querySelector<HTMLInputElement>('input[name="currency"]:checked')?.focus();
						} else {
							await update({ reset: false });
						}
					};
				}}
			>
				<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />
				<span id="currency-label" class="visually-hidden">Moneda</span>
				<SegmentedControl
					name="currency"
					options={currencyOptions}
					bind:value={selected}
					labelledby="currency-label"
					size="compact"
					onchange={() => currencyForm.requestSubmit()}
				/>
				<noscript><Button type="submit" variant="secondary">Guardar</Button></noscript>
				{#if currencyError}
					<p class="currency-error" role="alert">{currencyError}</p>
				{/if}
			</form>
			<a
				href={profileHref}
				class="profile-link"
				aria-label="Perfil"
				aria-current={isActive('/profile') ? 'page' : undefined}
			>
				<Icon name="profile" />
			</a>
		</div>
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
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 10;
		container-type: inline-size;
		padding: var(--space-4);
		padding-inline: max(var(--space-5), calc((100% - var(--content-width)) / 2 + var(--space-5)));
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}

	@media (max-width: 30rem) {
		.topbar {
			padding-inline: var(--space-4);
		}
	}

	.topbar-grid {
		display: grid;
		grid-template-columns: auto 1fr auto;
		grid-template-areas:
			'brand control profile'
			'error error error';
		align-items: center;
		column-gap: var(--space-2);
	}

	.topbar-grid > :global(.wordmark) {
		grid-area: brand;
	}

	/* Contents so the track and the error become grid items of the topbar. */
	.currency-form {
		display: contents;
	}

	.currency-form > :global(.track) {
		grid-area: control;
		justify-self: end;
		min-width: 0;
	}

	/* No-JS fallback button: own full-width row below the bar. */
	.currency-form > :global(noscript) {
		grid-column: 1 / -1;
	}

	.currency-error {
		grid-area: error;
		margin: var(--space-2) 0 0;
		font-size: var(--font-size-sm);
		color: var(--negative);
	}

	/* Not enough room for one row (also at large text: everything is rem-sized). */
	@container (max-width: 20rem) {
		.topbar-grid {
			grid-template-columns: 1fr auto;
			grid-template-areas:
				'brand profile'
				'control control'
				'error error';
			row-gap: var(--space-2);
		}

		.currency-form > :global(.track) {
			justify-self: stretch;
		}

		.currency-form > :global(.track .option) {
			flex: 1 1 0;
			white-space: normal;
		}
	}

	/* Wordmark + profile no longer fit side by side: stack them. */
	@container (max-width: 9rem) {
		.topbar-grid {
			grid-template-columns: 1fr;
			grid-template-areas:
				'brand'
				'profile'
				'control'
				'error';
			justify-items: start;
		}

		.currency-form > :global(.track) {
			justify-self: stretch;
		}
	}

	.profile-link {
		grid-area: profile;
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
		background: var(--muted);
	}

	.profile-link[aria-current='page'] {
		background: var(--muted);
	}

	.content {
		flex: 1;
		width: 100%;
		max-width: var(--content-width);
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
		.profile-link,
		.nav-fab {
			transition-property: opacity, color, background-color, transform;
		}

		.nav-item {
			transition:
				color 0.15s ease,
				transform 0.15s ease;
		}
	}

	.profile-link:active,
	.nav-item:active,
	.nav-fab:active {
		transform: scale(0.96);
	}
</style>
