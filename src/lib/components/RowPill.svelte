<script lang="ts">
	/**
	 * The 2rem pill of a row's quick action ("Aprobar", "Revisar", "Deshacer") in a 44px tap area,
	 * above the row's stretched link. A submit button, or a link (`href`, already resolved).
	 */
	let {
		label,
		href,
		onclick,
		positive = false,
		hidden = false,
		ariaLabel
	}: {
		label: string;
		href?: string;
		onclick?: (e: MouseEvent) => void;
		/** The `--positive` tint (a suggested approve). */
		positive?: boolean;
		/** A shortcut that only widens the tap target: hidden from assistive technology. */
		hidden?: boolean;
		ariaLabel?: string;
	} = $props();
</script>

{#if href}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass a resolved href -->
	<a
		{href}
		{onclick}
		class="pill"
		class:positive
		aria-hidden={hidden ? 'true' : undefined}
		tabindex={hidden ? -1 : undefined}>{label}</a
	>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button type="submit" class="pill" class:positive aria-label={ariaLabel}>{label}</button>
{/if}

<style>
	.pill {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		height: 2rem;
		padding: 0 var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--text);
		font-size: var(--font-size-xs);
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.pill::after {
		content: '';
		position: absolute;
		inset: -0.375rem -0.25rem;
	}

	.positive {
		border-color: transparent;
		background: color-mix(in oklab, var(--positive) 14%, transparent);
		color: var(--positive);
		font-weight: 600;
	}

	.pill:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: no-preference) {
		.pill {
			transition: transform var(--dur-fast) var(--ease-out);
		}

		.pill:active {
			transform: scale(0.96);
		}
	}
</style>
