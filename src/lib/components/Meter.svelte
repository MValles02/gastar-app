<script lang="ts">
	/** Thin progress bar. With `label` it is announced as a meter; without, it is decoration. */
	let {
		percent,
		color,
		label,
		valueText
	}: {
		percent: number;
		/** CSS colour (a swatch variable). */
		color: string;
		label?: string;
		valueText?: string;
	} = $props();

	const shown = $derived(Math.min(100, Math.max(0, percent)));
</script>

<div
	class="bar"
	style:--tone={color}
	role={label ? 'meter' : undefined}
	aria-label={label}
	aria-valuemin={label ? 0 : undefined}
	aria-valuemax={label ? 100 : undefined}
	aria-valuenow={label ? percent : undefined}
	aria-valuetext={label ? valueText : undefined}
>
	<!-- A full-width fill slid left by the empty share: it keeps its rounded end and moves on the GPU. -->
	<span class="fill" style:transform="translateX({shown - 100}%)"></span>
</div>

<style>
	.bar {
		width: 100%;
		height: 0.375rem;
		overflow: hidden;
		background: var(--muted);
		border-radius: var(--radius-pill);
	}

	.fill {
		display: block;
		width: 100%;
		height: 100%;
		background: var(--tone);
		border-radius: var(--radius-pill);
	}

	@media (prefers-reduced-motion: no-preference) {
		.fill {
			transition: transform var(--dur-slow) var(--ease-out);
		}
	}
</style>
