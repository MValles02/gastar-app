<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		href,
		leading,
		title,
		subtitle,
		trailing
	}: {
		href: string;
		leading?: Snippet;
		title: Snippet;
		subtitle?: Snippet;
		trailing?: Snippet;
	} = $props();
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass an already resolved href -->
<a {href} class="row">
	{#if leading}{@render leading()}{/if}
	<span class="main">
		<span class="title">{@render title()}</span>
		{#if subtitle}<span class="subtitle">{@render subtitle()}</span>{/if}
	</span>
	{#if trailing}<span class="trailing">{@render trailing()}</span>{/if}
</a>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--tap-target);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--border);
		text-decoration: none;
	}

	@media (prefers-reduced-motion: no-preference) {
		.row {
			transition: background-color var(--ease-fast);
		}
	}

	@media (hover: hover) {
		.row:hover {
			background: var(--muted);
		}
	}

	.row:active {
		background: var(--muted);
	}

	.row:focus-visible {
		outline-offset: -2px;
	}

	.main {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}

	.title,
	.subtitle {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.title {
		font-size: var(--font-size-base);
		font-weight: 500;
	}

	.subtitle {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.trailing {
		flex: 0 1 auto;
		min-width: 0;
	}
</style>
