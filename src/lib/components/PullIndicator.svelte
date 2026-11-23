<script lang="ts">
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
</script>

<!--
	The pull-to-refresh indicator (`pullRefresh`, src/lib/pull-refresh.ts, which positions it below
	the header and drives its opacity, offset and `data-state`): an arrow that turns as the pull
	nears the threshold and points up in the primary colour once armed, then a spinner while the
	data reloads. Decorative (aria-hidden); the status line announces "Actualizando…" and "Actualizado".
-->
<div class="pull-indicator" data-pull-indicator data-state="idle" aria-hidden="true">
	<span class="arrow" data-pull-arrow><ArrowDown class="size-4" /></span>
	<span class="spinner"><LoaderCircle class="size-4" /></span>
</div>
<p class="sr-only" role="status" data-pull-status></p>

<style>
	.pull-indicator {
		position: fixed;
		top: 0;
		left: 50%;
		z-index: 8;
		width: 2rem;
		height: 2rem;
		margin-left: -1rem;
		display: grid;
		place-items: center;
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--text-muted);
		opacity: 0;
		pointer-events: none;
		transition: color 0.15s ease;
	}

	.pull-indicator > span {
		grid-area: 1 / 1;
		display: grid;
	}

	.spinner,
	.pull-indicator:global([data-state='refreshing']) .arrow {
		opacity: 0;
	}

	.pull-indicator:global([data-state='refreshing']) .spinner {
		opacity: 1;
	}

	.pull-indicator:global([data-state='armed']),
	.pull-indicator:global([data-state='refreshing']) {
		color: var(--primary);
	}

	@media (prefers-reduced-motion: no-preference) {
		.pull-indicator:global([data-state='refreshing']) .spinner {
			animation: pull-spin 0.8s linear infinite;
		}
	}

	@keyframes pull-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
