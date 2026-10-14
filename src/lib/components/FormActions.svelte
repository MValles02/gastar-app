<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';

	/** Cancelar (1/3) + primary submit (2/3) side by side, pinned to the bottom of the viewport. */
	let {
		cancelHref,
		submitLabel,
		submitting = false,
		sticky = true
	}: { cancelHref: string; submitLabel: string; submitting?: boolean; sticky?: boolean } = $props();
</script>

<div class="bar" class:sticky>
	<Button
		href={resolve(cancelHref as '/')}
		variant="outline"
		class="h-auto min-h-11 min-w-0 flex-1 whitespace-normal">Cancelar</Button
	>
	<Button
		type="submit"
		class="h-auto min-h-11 min-w-0 flex-[2] whitespace-normal"
		disabled={submitting}
		aria-busy={submitting ? 'true' : undefined}
	>
		{#if submitting}<span class="spin" aria-hidden="true"></span>{/if}{submitLabel}
	</Button>
</div>

<style>
	.bar {
		display: flex;
		gap: var(--space-3);
	}

	/* Full-bleed bar pinned to the bottom of the viewport (no tab bar on form screens). */
	.bar.sticky {
		position: sticky;
		bottom: 0;
		z-index: 2;
		margin-inline: calc(var(--gutter, var(--space-5)) * -1);
		padding: var(--space-3) var(--gutter, var(--space-5))
			calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--bg);
		box-shadow: 0 -1px 0 var(--border);
	}

	.spin {
		width: 1rem;
		height: 1rem;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spin {
			animation-duration: 2.4s;
		}
	}
</style>
