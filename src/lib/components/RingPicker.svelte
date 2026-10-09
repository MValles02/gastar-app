<script lang="ts" generics="Key extends string">
	import type { Snippet } from 'svelte';

	/** Radio group of round swatches (IconPicker, ColorPicker); the label is for screen readers only. */
	let {
		name,
		legend,
		options,
		value = $bindable(),
		swatch
	}: {
		name: string;
		legend: string;
		options: readonly { key: Key; label: string }[];
		value: Key;
		swatch: Snippet<[Key]>;
	} = $props();
</script>

<fieldset>
	<legend>{legend}</legend>
	<div class="options">
		{#each options as option (option.key)}
			<label class="option">
				<input class="visually-hidden" type="radio" {name} value={option.key} bind:group={value} />
				<span class="ring">{@render swatch(option.key)}</span>
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
		border-radius: var(--radius-pill);
		outline: 2px solid transparent;
		outline-offset: 2px;
	}

	.option:has(input:checked) .ring {
		box-shadow:
			0 0 0 2px var(--surface),
			0 0 0 4px var(--text);
	}

	.option:has(input:focus-visible) .ring {
		outline-color: var(--primary);
		outline-offset: 4px;
	}
</style>
