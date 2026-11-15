<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Wordmark from '#lib/components/Wordmark.svelte';

	// Centered, narrow column shared by the signed-out pages: wordmark, optional "Volver" link at the top,
	// status icon, title and description. Without a title the wordmark is the page heading (Ingresar / Crear cuenta).
	let {
		children,
		backHref,
		title,
		description,
		icon
	}: {
		children: Snippet;
		backHref?: string;
		title?: string;
		description?: Snippet | string;
		icon?: ComponentProps<typeof Icon>['name'];
	} = $props();
</script>

<main class="page">
	{#if backHref}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass a resolved href -->
		<a class="back" href={backHref}>
			<Icon name="chevron-left" size="1.25rem" />Volver
		</a>
	{/if}

	{#if title}
		<div class="brand"><Wordmark size="2.25rem" /></div>
		<header>
			{#if icon}
				<span class="media" aria-hidden="true"><Icon name={icon} size="1.5rem" /></span>
			{/if}
			<h1>{title}</h1>
			{#if typeof description === 'string'}
				<p>{description}</p>
			{:else if description}
				<p>{@render description()}</p>
			{/if}
		</header>
	{:else}
		<h1 class="brand"><Wordmark size="2.25rem" /></h1>
	{/if}

	{@render children()}
</main>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100vh;
		min-height: 100dvh;
		width: 100%;
		max-width: 400px;
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: var(--space-5);
		padding: max(var(--space-5), env(safe-area-inset-top))
			max(var(--space-5), env(safe-area-inset-right))
			max(var(--space-5), env(safe-area-inset-bottom))
			max(var(--space-5), env(safe-area-inset-left));
	}

	.back {
		position: absolute;
		top: max(var(--space-2), env(safe-area-inset-top));
		left: max(var(--space-2), env(safe-area-inset-left));
		display: inline-flex;
		align-items: center;
		gap: 2px;
		min-height: var(--tap-target);
		padding-inline: var(--space-1) var(--space-3);
		font-size: var(--font-size-base);
		font-weight: 500;
		color: var(--text);
		text-decoration: none;
	}

	.brand {
		margin: 0;
		font: inherit;
	}

	header {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-3);
	}

	.media {
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: var(--radius-card);
		background: var(--muted);
		color: var(--text);
	}

	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--font-size-xl);
		font-weight: 500;
		line-height: 1.15;
		letter-spacing: -0.01em;
		text-wrap: balance;
	}

	header h1 {
		margin: 0;
	}

	p {
		margin: 0;
		font-size: var(--font-size-base);
		line-height: 1.5;
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}

	p :global(b) {
		color: var(--text);
		font-weight: 600;
	}
</style>
