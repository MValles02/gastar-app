<script lang="ts">
	import type { Snippet } from 'svelte';
	import XIcon from '@lucide/svelte/icons/x';
	import * as Drawer from '$lib/components/ui/drawer/index.js';

	let {
		title,
		open = $bindable(false),
		onclose,
		children
	}: { title: string; open?: boolean; onclose?: () => void; children: Snippet } = $props();
</script>

<Drawer.Root bind:open shouldScaleBackground={false} onClose={() => onclose?.()}>
	<Drawer.Portal>
		<Drawer.Overlay class="bd-overlay" />
		<Drawer.Content class="bd-content">
			<div class="bd-handle" aria-hidden="true"></div>
			<Drawer.Header class="bd-header">
				<Drawer.Title class="bd-title">{title}</Drawer.Title>
				<Drawer.Close class="bd-close" aria-label="Cerrar">
					<XIcon size={24} strokeWidth={1.75} aria-hidden="true" />
				</Drawer.Close>
			</Drawer.Header>
			<div class="bd-body">
				{@render children()}
			</div>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>

<style>
	/* Portaled to <body>, so selectors are global. Unlayered CSS beats the Tailwind utilities layer. */
	:global(.bd-overlay) {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: var(--scrim);
	}

	:global(.bd-content) {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: min(35rem, 100%);
		max-height: 85dvh;
		margin-inline: auto;
		background: var(--surface-raised);
		color: var(--text);
		border: 0;
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		box-shadow: var(--shadow-2);
	}

	:global(.bd-handle) {
		flex-shrink: 0;
		width: 2.5rem;
		height: 0.25rem;
		margin: var(--space-2) auto 0;
		border-radius: 999px;
		background: var(--border);
	}

	:global(.bd-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-5) 0;
	}

	:global(.bd-title) {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--text);
	}

	:global(.bd-close) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		min-width: 2.75rem;
		min-height: 2.75rem;
		margin-inline-end: calc(var(--space-2) * -1);
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--text);
		cursor: pointer;
	}

	:global(.bd-body) {
		overflow-y: auto;
		padding: var(--space-3) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom));
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.bd-overlay),
		:global(.bd-content) {
			transition-duration: 0.01ms !important;
			animation-duration: 0.01ms !important;
		}
	}
</style>
