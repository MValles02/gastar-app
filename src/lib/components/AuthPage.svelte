<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Wordmark from '#lib/components/Wordmark.svelte';
	import * as Card from '#lib/components/ui/card/index.js';

	// Shared layout of the signed-out pages, in Home's language: an emerald band (optional "Volver"
	// link, wordmark, status icon, title and description in on-primary) and a surface card holding
	// the page's content, overlapping the band's lower edge. Without a title the wordmark is the page
	// heading (Ingresar / Crear cuenta).
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
	<div class="band">
		<div class="column">
			{#if backHref}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass a resolved href -->
				<a class="back" href={backHref}>
					<Icon name="chevron-left" size="md" />Volver
				</a>
			{/if}

			{#if title}
				<div class="brand"><Wordmark size="2.25rem" tone="primary" /></div>
				<header>
					{#if icon}
						<span class="media" aria-hidden="true"><Icon name={icon} size="lg" /></span>
					{/if}
					<h1>{title}</h1>
					{#if typeof description === 'string'}
						<p>{description}</p>
					{:else if description}
						<p>{@render description()}</p>
					{/if}
				</header>
			{:else}
				<h1 class="brand"><Wordmark size="2.25rem" tone="primary" /></h1>
			{/if}
		</div>
	</div>

	<div class="column body">
		<Card.Root>
			<Card.Content class="flex flex-col gap-(--space-5)">
				{@render children()}
			</Card.Content>
		</Card.Root>
	</div>
</main>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100vh;
		min-height: 100dvh;
		width: 100%;
		display: flex;
		flex-direction: column;
		padding-bottom: max(var(--space-5), env(safe-area-inset-bottom));
	}

	.column {
		box-sizing: border-box;
		width: 100%;
		max-width: 400px;
		margin-inline: auto;
		padding-inline: max(var(--space-5), env(safe-area-inset-left))
			max(var(--space-5), env(safe-area-inset-right));
	}

	/* The emerald band, as on the tab screens: the card below overlaps its lower edge. */
	.band {
		position: relative;
		background: var(--primary);
		color: var(--on-primary);
		padding-top: max(var(--space-5), env(safe-area-inset-top));
		padding-bottom: var(--space-8);
		margin-bottom: calc(var(--space-6) * -1);
	}

	/* Emerald above the band, so the iOS top overscroll bounce never uncovers the cream page. */
	.band::before {
		content: '';
		position: absolute;
		bottom: 100%;
		left: 0;
		right: 0;
		height: 100vh;
		background: var(--primary);
		pointer-events: none;
	}

	.band .column {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	/* The card paints over the band. */
	.body {
		position: relative;
	}

	.back {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 2px;
		min-height: var(--tap-target);
		margin-block: calc(-1 * var(--space-3)) calc(-1 * var(--space-2));
		margin-inline-start: calc(-1 * var(--space-2));
		padding-inline: var(--space-1) var(--space-3);
		border-radius: var(--radius);
		font-size: var(--font-size-base);
		font-weight: 500;
		color: var(--on-primary);
		text-decoration: none;
		transition: background-color var(--dur-fast) var(--ease-out);
	}

	.back:active {
		background: color-mix(in oklab, var(--on-primary) 12%, transparent);
	}

	.back:focus-visible {
		outline: 2px solid var(--on-primary);
		outline-offset: 2px;
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
		background: color-mix(in oklab, var(--on-primary) 12%, transparent);
		color: var(--on-primary);
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

	p {
		margin: 0;
		font-size: var(--font-size-base);
		line-height: 1.5;
		color: var(--on-primary);
		overflow-wrap: anywhere;
	}

	p :global(b) {
		font-weight: 600;
	}
</style>
