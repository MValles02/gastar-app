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
		min-height: 2.75rem;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--border);
		text-decoration: none;
		transition: background-color 0.15s ease;
	}

	.row:hover {
		background: color-mix(in srgb, var(--primary) 8%, transparent);
	}

	@media (prefers-reduced-motion: no-preference) {
		.row {
			transition-property: background-color, transform;
		}
	}

	.row:active {
		transform: scale(0.98);
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
		font-weight: 500;
	}

	.subtitle {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.trailing {
		flex: none;
	}
</style>
