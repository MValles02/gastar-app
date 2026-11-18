<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import * as Item from '#lib/components/ui/item/index.js';
	import { cn } from '#lib/utils.js';

	let {
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLDivElement> & { children?: Snippet } = $props();
</script>

<Item.Group
	class={cn(
		'gap-0 overflow-hidden rounded-(--radius-card) border border-(--border) bg-(--surface) shadow-(--shadow-1)',
		className
	)}
	{...rest}
>
	{@render children?.()}
</Item.Group>
