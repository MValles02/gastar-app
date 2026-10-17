<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		value,
		label,
		...restProps
	}: WithoutChildrenOrChild<SelectPrimitive.ItemProps> = $props();
</script>

<SelectPrimitive.Item
	bind:ref
	{value}
	{label}
	data-slot="select-item"
	class={cn(
		'flex min-h-11 cursor-default items-center rounded-md px-3 text-sm capitalize outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted data-[selected]:font-semibold',
		className
	)}
	{...restProps}
>
	{label ?? value}
</SelectPrimitive.Item>
