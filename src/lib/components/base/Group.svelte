<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * A card of stacked `Row`s (lists, detail screens and forms). A caller's `<li class="bad">` gets a
	 * left `--negative` bar, or a full `--negative` outline with `outlineErrors` (the drawers).
	 */
	let {
		labelledby,
		outlineErrors = false,
		class: className = '',
		children,
		...rest
	}: HTMLAttributes<HTMLUListElement> & {
		labelledby?: string;
		outlineErrors?: boolean;
		children: Snippet;
	} = $props();
</script>

<ul
	role="list"
	class={['group', className, outlineErrors && 'outline-errors']}
	aria-labelledby={labelledby}
	{...rest}
>
	{@render children()}
</ul>

<style>
	.group {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--card-edge);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.group > :global(li.bad) {
		box-shadow: inset 3px 0 0 var(--negative);
	}

	.group.outline-errors > :global(li.bad) {
		box-shadow: inset 0 0 0 1.5px var(--negative);
	}
</style>
