<script lang="ts">
	import { SWATCHES, type SwatchKey } from '$lib/appearance';

	let {
		name,
		legend,
		value = $bindable()
	}: { name: string; legend: string; value: SwatchKey } = $props();
</script>

<fieldset>
	<legend>{legend}</legend>
	<div class="options">
		{#each SWATCHES as option (option.key)}
			<label class="option">
				<input class="visually-hidden" type="radio" {name} value={option.key} bind:group={value} />
				<span class="ring"
					><span class="dot" style:background="var(--swatch-{option.key})"></span></span
				>
				<span class="visually-hidden">{option.label}</span>
			</label>
		{/each}
	</div>
</fieldset>

<style>
	fieldset {
		border: 0;
		padding: 0;
		min-width: 0;
	}

	legend {
		padding: 0;
		margin-bottom: var(--space-2);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.options {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.option {
		position: relative;
		display: block;
		cursor: pointer;
	}

	.ring {
		display: block;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: var(--radius-pill);
		outline: 2px solid transparent;
		outline-offset: 2px;
	}

	.dot {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: var(--radius-pill);
	}

	.option:has(input:checked) .ring {
		outline-color: var(--primary);
	}

	.option:has(input:focus-visible) .ring {
		outline-color: var(--primary);
		outline-offset: 4px;
	}
</style>
