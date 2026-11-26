<script lang="ts" module>
	/** Commits a choice: sets it, closes the sheet, fires `change` and returns focus to the row. */
	export type Pick = (set: () => void) => Promise<void>;
</script>

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { cn } from '#lib/utils.js';

	/**
	 * The one picker shell: the 56px row (label left, value right, chevron) and the sheet it opens,
	 * titled `title` with the drawer's close button. The sheet stacks over a drawer it is rendered in
	 * (BottomDrawer reads that from context). The body gets `pick`, which sets the value, closes the
	 * sheet, lets ancestors (a filter form) see a bubbling `change` from `changeFrom`, then focuses
	 * the row again. Pickers that keep the sheet open (multi-select) just never call it.
	 */
	let {
		labelId,
		valueId = `${labelId}-value`,
		label,
		title = label,
		value,
		placeholder = false,
		strongPlaceholder = false,
		invalid = false,
		describedBy,
		scrollMargin = true,
		open = $bindable(false),
		onopen,
		onclosed,
		changeFrom,
		class: className,
		labelClass,
		valueClass,
		children
	}: {
		labelId: string;
		valueId?: string;
		label: string;
		/** The sheet's title; default: the row's label. */
		title?: string;
		value: string | Snippet;
		/** The value is the empty-state text: muted. */
		placeholder?: boolean;
		/** Keeps the empty-state text at the row's medium weight instead of regular. */
		strongPlaceholder?: boolean;
		invalid?: boolean;
		describedBy?: string;
		/** Leaves room for the sticky save bar when the row is scrolled into view. */
		scrollMargin?: boolean;
		open?: boolean;
		/** Runs on a tap on the row, before the sheet opens (reset the body's own state). */
		onopen?: () => void;
		/** Runs once the sheet has finished closing. */
		onclosed?: () => void;
		/** The hidden input a pick dispatches `change` from; none: no event. */
		changeFrom?: HTMLElement | null;
		class?: string;
		labelClass?: string;
		valueClass?: string;
		children: Snippet<[Pick]>;
	} = $props();

	let trigger: HTMLButtonElement | null = $state(null);

	const pick: Pick = async (set) => {
		set();
		open = false;
		await tick();
		changeFrom?.dispatchEvent(new Event('change', { bubbles: true }));
		trigger?.focus();
	};
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
	bind:ref={trigger}
	onclick={() => {
		onopen?.();
		open = true;
	}}
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
<BottomDrawer {title} {onclosed} bind:open>
	{@render children(pick)}
</BottomDrawer>

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
