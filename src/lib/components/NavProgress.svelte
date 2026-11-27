<script lang="ts">
	import { navigating } from '$app/state';
	import { NAV_PROGRESS_DELAY_MS } from '#lib/constants.ts';

	let visible = $state(false);

	$effect(() => {
		if (!navigating.to) {
			visible = false;
			return;
		}
		const timer = setTimeout(() => (visible = true), NAV_PROGRESS_DELAY_MS);
		return () => clearTimeout(timer);
	});
</script>

<!--
	Thin indeterminate bar at the top while a navigation's data loads for more than 150ms. It is gone
	before the page transition starts (onNavigate runs after the load) and is left out of the
	transition's snapshots (`nav-progress` in app.css). Reduced motion shows it still.
-->
{#if visible}
	<div class="nav-progress" role="progressbar" aria-label="Cargando"><span></span></div>
{/if}

<style>
	.nav-progress {
		position: fixed;
		top: env(safe-area-inset-top);
		left: 0;
		right: 0;
		z-index: 100;
		height: 3px;
		overflow: hidden;
		pointer-events: none;
		view-transition-name: nav-progress;
	}

	span {
		display: block;
		width: 40%;
		height: 100%;
		border-radius: var(--radius-pill);
		background: var(--primary);
	}

	@media (prefers-reduced-motion: no-preference) {
		span {
			animation: nav-progress-slide 1.1s var(--ease-drawer) infinite;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		span {
			width: 100%;
		}
	}

	@keyframes nav-progress-slide {
		from {
			transform: translateX(-100%);
		}

		to {
			transform: translateX(250%);
		}
	}
</style>
