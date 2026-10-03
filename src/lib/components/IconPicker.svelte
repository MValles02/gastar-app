<script lang="ts">
	import { ACCOUNT_ICONS, type AccountIconKey, type SwatchKey } from '$lib/appearance';
	import IconBadge from './IconBadge.svelte';

	let {
		name,
		legend,
		value = $bindable(),
		color = null
	}: { name: string; legend: string; value: AccountIconKey; color?: SwatchKey | null } = $props();
</script>

<fieldset>
	<legend>{legend}</legend>
	<div class="options">
		{#each ACCOUNT_ICONS as option (option.key)}
			<label class="option">
				<input class="visually-hidden" type="radio" {name} value={option.key} bind:group={value} />
				<span class="ring"><IconBadge icon={option.key} {color} /></span>
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
