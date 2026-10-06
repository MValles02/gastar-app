<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Props = {
		variant?: 'primary' | 'secondary' | 'danger';
		block?: boolean;
		href?: string;
		children: Snippet;
	} & Omit<HTMLButtonAttributes, 'children'> &
		Omit<HTMLAnchorAttributes, 'children'>;

	let { variant = 'primary', block = false, href, children, ...rest }: Props = $props();
</script>

{#if href}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass an already resolved href -->
	<a {href} class="btn {variant}" class:block {...rest as HTMLAnchorAttributes}>
		{@render children()}
	</a>
{:else}
	<button class="btn {variant}" class:block {...rest as HTMLButtonAttributes}>
		{@render children()}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		max-width: 100%;
		box-sizing: border-box;
		overflow-wrap: anywhere;
		text-align: center;
		font-family: inherit;
		font-size: var(--font-size-sm);
		font-weight: 500;
		line-height: 1.5;
		text-decoration: none;
		border-radius: var(--radius);
		border: 1px solid transparent;
		min-height: 2.75rem;
		padding: var(--space-2) var(--space-4);
		cursor: pointer;
		transition:
			opacity 0.15s ease,
			background-color 0.15s ease;
	}

	.primary {
		background: var(--primary);
		color: var(--on-primary);
	}

	.primary:hover {
		opacity: 0.9;
	}

	.secondary,
	.danger {
		background: var(--surface);
		color: var(--text);
		border-color: var(--border);
	}

	.danger {
		color: var(--negative);
		border-color: color-mix(in srgb, var(--negative) 50%, transparent);
	}

	.secondary:hover,
	.danger:hover {
		opacity: 1;
		background: var(--muted);
	}

	.block {
		width: 100%;
	}

	.btn:disabled,
	.btn[aria-disabled='true'] {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (prefers-reduced-motion: no-preference) {
		.btn {
			transition-property: opacity, background-color, transform;
		}
	}

	.btn:active:not(:disabled) {
		transform: scale(0.98);
	}
</style>
