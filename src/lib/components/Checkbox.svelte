<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		label,
		checked = $bindable(false),
		...rest
	}: { label: string; checked?: boolean } & Omit<
		HTMLInputAttributes,
		'type' | 'checked'
	> = $props();
</script>

<label class="check">
	<input type="checkbox" bind:checked {...rest} />
	<span>{label}</span>
</label>

<style>
	.check {
		flex-direction: row;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--tap-target);
		font-size: var(--font-size-base);
		color: var(--text);
		cursor: pointer;
	}

	.check input {
		flex: none;
		width: 1.25rem;
		height: 1.25rem;
		min-height: 0;
		padding: 0;
		margin: 0;
		accent-color: var(--primary);
	}
</style>
