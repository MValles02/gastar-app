<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import { upOnClick } from '#lib/nav-stack.svelte.ts';

	/**
	 * Cancel and primary action side by side (50/50), pinned to the bottom of the viewport. The primary
	 * is a submit button, a link (`submitHref`) or a custom `primary` snippet. Hrefs are unresolved paths.
	 */
	let {
		cancelHref,
		cancelLabel = 'Cancelar',
		submitLabel,
		submitHref,
		submitting = false,
		sticky = true,
		primary,
		destructive,
		form
	}: {
		cancelHref: string;
		cancelLabel?: string;
		submitLabel?: string;
		submitHref?: string;
		submitting?: boolean;
		sticky?: boolean;
		primary?: Snippet;
		/** When set: [destructive | submit] 50/50 on top, cancel full width below. */
		destructive?: Snippet;
		/** `id` of a `<form>` elsewhere in the page the submit button submits. */
		form?: string;
	} = $props();
</script>

{#snippet cancel()}
	<Button
		href={resolve(cancelHref as '')}
		onclick={upOnClick(resolve(cancelHref as ''))}
		variant="outline"
		class="h-auto min-h-[50px] min-w-0 flex-1 basis-0 whitespace-normal">{cancelLabel}</Button
	>
{/snippet}

{#snippet submit()}
	<Button
		type="submit"
		{form}
		class="h-auto min-h-[50px] min-w-0 flex-1 basis-0 whitespace-normal"
		disabled={submitting}
		aria-busy={submitting ? 'true' : undefined}
	>
		{#if submitting}<span class="spin" aria-hidden="true"></span>{/if}{submitLabel}
	</Button>
{/snippet}

<div class="bar" class:sticky class:stacked={!!destructive}>
	{#if destructive}
		<div class="pair">
			<div class="half">{@render destructive()}</div>
			{@render submit()}
		</div>
		{@render cancel()}
	{:else}
		{@render cancel()}
		{#if primary}
			<div class="half">{@render primary()}</div>
		{:else if submitHref}
			<Button
				href={resolve(submitHref as '')}
				class="h-auto min-h-[50px] min-w-0 flex-1 basis-0 whitespace-normal">{submitLabel}</Button
			>
		{:else}
			{@render submit()}
		{/if}
	{/if}
</div>

<style>
	.bar {
		display: flex;
		gap: var(--space-3);
	}

	.bar.stacked {
		flex-direction: column;
	}

	.stacked > :global(a) {
		flex: none;
	}

	.pair {
		display: flex;
		gap: var(--space-3);
	}

	.half {
		flex: 1 1 0;
		min-width: 0;
	}

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
