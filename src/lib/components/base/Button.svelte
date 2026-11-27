<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	/**
	 * Pill button or link. `primary` (solid), `outline`, `positive` (the green tint of a suggested
	 * approve) and `destructive` (a full-width row). `sm` is a row's quick-action pill: 2rem tall with a
	 * 44px hit area, above the row's stretched link. `class` is for layout only.
	 */
	let {
		variant = 'primary',
		size = 'md',
		href,
		type = 'button',
		class: className = '',
		children,
		...rest
	}: (HTMLAnchorAttributes & HTMLButtonAttributes) & {
		variant?: 'primary' | 'outline' | 'positive' | 'destructive';
		size?: 'md' | 'sm';
		href?: string;
		type?: 'button' | 'submit';
		class?: string;
		children: Snippet;
	} = $props();
</script>

{#if href}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass a resolved href -->
	<a {href} class={['btn', className]} data-variant={variant} data-size={size} {...rest}
		>{@render children()}</a
	>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button {type} class={['btn', className]} data-variant={variant} data-size={size} {...rest}
		>{@render children()}</button
	>
{/if}

<style>
	.btn {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: var(--size-field);
		padding: 0 var(--space-5);
		border: 1px solid transparent;
		border-radius: var(--radius-pill);
		background: var(--primary);
		color: var(--on-primary);
		font-size: var(--font-size-base);
		font-weight: 600;
		text-align: center;
		text-decoration: none;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	.btn[data-variant='outline'] {
		border-color: var(--border);
		background: var(--surface);
		color: var(--text);
	}

	.btn[data-variant='positive'] {
		border-color: transparent;
		background: color-mix(in oklab, var(--positive) var(--tint-soft), transparent);
		color: var(--positive);
	}

	.btn[data-variant='destructive'] {
		display: flex;
		width: 100%;
		border-radius: var(--radius-card);
		background: var(--surface);
		color: var(--negative);
	}

	.btn[data-size='sm'] {
		z-index: 1;
		min-height: var(--size-pill);
		height: var(--size-pill);
		padding: 0 var(--space-3);
		font-size: var(--font-size-xs);
		font-weight: 500;
		white-space: nowrap;
	}

	.btn[data-size='sm'][data-variant='positive'] {
		font-weight: 600;
	}

	.btn[data-size='sm']::after {
		content: '';
		position: absolute;
		inset: -0.375rem -0.25rem;
	}

	@media (prefers-reduced-motion: no-preference) {
		.btn {
			transition: transform var(--dur-fast) var(--ease-out);
		}

		.btn:active {
			transform: scale(0.96);
		}
	}
</style>
