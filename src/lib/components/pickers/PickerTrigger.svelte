<script lang="ts">
	import type { Snippet } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '#lib/components/ui/button/index.js';
	import { cn } from '#lib/utils.js';

	/** The 56px row (label left, value right, chevron) that opens a picker's drawer. */
	let {
		labelId,
		valueId = `${labelId}-value`,
		label,
		value,
		placeholder = false,
		strongPlaceholder = false,
		invalid = false,
		describedBy,
		scrollMargin = true,
		ref = $bindable(null),
		onclick,
		class: className,
		labelClass,
		valueClass
	}: {
		labelId: string;
		valueId?: string;
		label: string;
		value: string | Snippet;
		/** The value is the empty-state text: muted. */
		placeholder?: boolean;
		/** Keeps the empty-state text at the trigger's medium weight instead of regular. */
		strongPlaceholder?: boolean;
		invalid?: boolean;
		describedBy?: string;
		/** Leaves room for the sticky save bar when the row is scrolled into view. */
		scrollMargin?: boolean;
		ref?: HTMLButtonElement | null;
		onclick: () => void;
		class?: string;
		labelClass?: string;
		valueClass?: string;
	} = $props();
</script>

<Button
	variant="ghost"
	class={cn(
		'h-14 w-full justify-between gap-3 rounded-none px-4',
		scrollMargin && 'scroll-mb-24',
		className
	)}
	aria-haspopup="dialog"
	aria-labelledby="{labelId} {valueId}"
	aria-invalid={invalid ? 'true' : undefined}
	aria-describedby={describedBy}
	bind:ref
	{onclick}
>
	<span class={['label', labelClass]} id={labelId}>{label}</span>
	<span
		id={valueId}
		class={['current', valueClass]}
		class:placeholder
		class:strong={strongPlaceholder}
	>
		{#if typeof value === 'string'}{value}{:else}{@render value()}{/if}
	</span>
	<ChevronRight
		size={16}
		strokeWidth={1.75}
		aria-hidden="true"
		class="flex-none text-muted-foreground"
	/>
</Button>

<style>
	.label {
		flex: none;
		font-size: var(--font-size-base);
		color: var(--text);
	}

	.current {
		flex: 1;
		min-width: 0;
		text-align: right;
		font-weight: 500;
	}

	.placeholder {
		color: var(--text-muted);
		font-weight: 400;
	}

	.placeholder.strong {
		font-weight: 500;
	}
</style>
