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
	<span class="fill" style:width="{percent}%"></span>
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
		height: 100%;
		background: var(--tone);
		border-radius: var(--radius-pill);
	}
</style>
