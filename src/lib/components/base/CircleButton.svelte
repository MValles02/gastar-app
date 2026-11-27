<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';

	/**
	 * Round icon control (--size-control) with an accessible `label`, as a link (`href`) or a button.
	 * `badge` is a count pill at the top right (hidden from assistive technology: put it in `label`).
	 * A `disabled` one always renders a disabled `<button>`.
	 */
	let {
		icon,
		label,
		href,
		type = 'button',
		tone = 'surface',
		badge,
		disabled = false,
		...rest
	}: (HTMLAnchorAttributes & HTMLButtonAttributes) & {
		icon: IconName;
		label: string;
		href?: string;
		type?: 'button' | 'submit';
		tone?: 'surface' | 'ghost' | 'on-primary';
		badge?: string | number;
		disabled?: boolean;
	} = $props();
</script>

{#snippet content()}
	<Icon name={icon} size="md" />
	{#if badge !== undefined}<span class="badge" aria-hidden="true">{badge}</span>{/if}
{/snippet}

{#if disabled}
	<button
		{type}
		class="circle"
		data-tone={tone}
		aria-label={label}
		disabled
		aria-disabled="true"
		{...rest}>{@render content()}</button
	>
{:else if href}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass a resolved href -->
	<a {href} class="circle" data-tone={tone} aria-label={label} {...rest}>{@render content()}</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button {type} class="circle" data-tone={tone} aria-label={label} {...rest}
		>{@render content()}</button
	>
{/if}

<style>
	.circle {
		position: relative;
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--size-control);
		height: var(--size-control);
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 50%;
		background: var(--surface);
		color: var(--text);
		text-decoration: none;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.circle[data-tone='ghost'] {
		background: transparent;
	}

	.circle[data-tone='on-primary'] {
		border-color: color-mix(in srgb, var(--on-primary) 35%, transparent);
		background: color-mix(in srgb, var(--on-primary) 8%, transparent);
		color: var(--on-primary);
	}

	.circle:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.circle:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	.circle[aria-current='page'] {
		/* Neutral, so the current-page ring never reads as the primary focus ring. */
		box-shadow: 0 0 0 2px var(--border-strong);
	}

	.badge {
		position: absolute;
		top: -0.375rem;
		right: -0.375rem;
		min-width: 1.25rem;
		padding: 0 var(--space-1);
		border-radius: var(--radius-pill);
		background: var(--primary);
		color: var(--on-primary);
		font-size: var(--font-size-xs);
		font-weight: 600;
		line-height: 1.25rem;
		text-align: center;
	}

	.circle[data-tone='on-primary'] .badge {
		background: var(--on-primary);
		color: var(--primary);
	}

	@media (prefers-reduced-motion: no-preference) {
		.circle {
			transition: transform var(--dur-fast) var(--ease-out);
		}

		.circle:active:not(:disabled) {
			transform: scale(0.96);
		}
	}
</style>
