<script lang="ts" module>
	/** Commits a choice: sets it, closes the sheet, fires `change` and returns focus to the row. */
	export type Pick = (set: () => void) => Promise<void>;
</script>

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import Row from '#lib/components/base/Row.svelte';

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
		valueClass?: string;
		children: Snippet<[Pick]>;
	} = $props();

	let trigger: HTMLElement | null = $state(null);

	const pick: Pick = async (set) => {
		set();
		open = false;
		await tick();
		changeFrom?.dispatchEvent(new Event('change', { bubbles: true }));
		trigger?.focus();
	};
</script>

{#snippet trailing()}
	<span class={valueClass} class:placeholder class:strong={strongPlaceholder}>
		{#if typeof value === 'string'}{value}{:else}{@render value()}{/if}
	</span>
{/snippet}

<Row
	item={false}
	class={`${scrollMargin ? 'scroll-mb-24' : ''} ${className ?? ''}`}
	title={label}
	{trailing}
	haspopup
	chevron
	{invalid}
	describedby={describedBy}
	titleId={labelId}
	trailingId={valueId}
	labelledby="{labelId} {valueId}"
	bind:ref={trigger}
	onclick={() => {
		onopen?.();
		open = true;
	}}
/>
<BottomDrawer {title} {onclosed} bind:open>
	{@render children(pick)}
</BottomDrawer>

<style>
	.placeholder {
		color: var(--text-muted);
		font-weight: 400;
	}

	.placeholder.strong {
		font-weight: 500;
	}
</style>
