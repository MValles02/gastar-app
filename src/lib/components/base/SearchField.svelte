<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import { es } from '#lib/copy/es.ts';

	/** Search capsule (--size-control tall) with a leading magnifier; `onPrimary` gives it no edge on a primary band. */
	let {
		name = 'q',
		value = '',
		label = es.ui.search,
		placeholder = es.ui.search,
		oninput,
		onPrimary = false
	}: {
		name?: string;
		value?: string;
		label?: string;
		placeholder?: string;
		oninput?: (e: Event) => void;
		onPrimary?: boolean;
	} = $props();
</script>

<label class="search" class:on-primary={onPrimary}>
	<Icon name="search" size="sm" />
	<input type="search" {name} {value} {placeholder} aria-label={label} {oninput} />
</label>

<style>
	.search {
		display: flex;
		flex: 1;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		height: var(--size-control);
		padding-inline: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--text-muted);
	}

	.search:focus-within {
		border-color: var(--ring);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
	}

	.on-primary {
		border-color: transparent;
	}

	.on-primary:focus-within {
		box-shadow: 0 0 0 3px var(--on-primary);
	}

	input {
		flex: 1;
		min-width: 0;
		height: 100%;
		padding: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--text);
		font-size: var(--font-size-input);
	}

	input::placeholder {
		color: var(--text-muted);
	}
</style>
