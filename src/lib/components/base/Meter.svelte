<script lang="ts">
	import type { Tone } from '#lib/appearance.ts';

	/** Thin progress bar. With `label` it is announced as a meter; without, it is decoration. */
	let {
		percent,
		tone,
		label,
		valueText
	}: {
		percent: number;
		tone: Tone;
		label?: string;
		valueText?: string;
	} = $props();

	const shown = $derived(Math.min(100, Math.max(0, percent)));
</script>

<meter
	class="meter"
	data-tone={tone}
	min="0"
	max="100"
	value={shown}
	aria-label={label}
	aria-valuetext={valueText}
	aria-hidden={label ? undefined : 'true'}
></meter>

<style>
	.meter {
		display: block;
		appearance: none;
		-webkit-appearance: none;
		width: 100%;
		height: var(--size-meter);
		border: 0;
		background: var(--muted);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}

	.meter::-webkit-meter-bar {
		height: var(--size-meter);
		border: 0;
		background: var(--muted);
		border-radius: var(--radius-pill);
	}

	.meter::-webkit-meter-optimum-value {
		background: var(--tone);
		border-radius: var(--radius-pill);
	}

	.meter::-moz-meter-bar {
		background: var(--tone);
		border-radius: var(--radius-pill);
	}
</style>
