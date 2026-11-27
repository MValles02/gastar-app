<script lang="ts">
	import { tick } from 'svelte';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';
	import { cssVars } from '#lib/css-vars.ts';

	/**
	 * Radio group drawn as a segmented switch: a track with one pill per option and a thumb sliding
	 * behind the checked one. `fit`: size each option to its text instead of sharing the width equally.
	 */
	let {
		name,
		options,
		value = $bindable(),
		labelledby,
		onchange,
		disabled = false,
		fit = false
	}: {
		name: string;
		options: { value: string; label: string; disabled?: boolean }[];
		value: string;
		labelledby?: string;
		onchange?: () => void;
		disabled?: boolean;
		fit?: boolean;
	} = $props();

	// The sliding thumb behind the checked option. Until it is measured (server render, before
	// hydration) the checked option paints its own background instead.
	let root = $state<HTMLElement | null>(null);
	let thumb = $state<{ x: number; w: number } | null>(null);
	let sliding = $state(false);

	function measure() {
		const i = options.findIndex((o) => o.value === value);
		const el = root?.querySelectorAll<HTMLElement>(':scope > label')[i];
		thumb = el ? { x: el.offsetLeft, w: el.offsetWidth } : null;
	}

	$effect(() => {
		void value;
		void options;
		measure();
	});

	$effect(() => {
		if (!root) return;
		const ro = new ResizeObserver(measure);
		ro.observe(root);
		// Placed without motion first; only later changes slide.
		const raf = requestAnimationFrame(() => (sliding = true));
		return () => {
			ro.disconnect();
			cancelAnimationFrame(raf);
		};
	});
</script>

<RadioGroup.Root
	bind:ref={root}
	{name}
	{disabled}
	bind:value
	aria-labelledby={labelledby}
	onValueChange={() => tick().then(() => onchange?.())}
	class="seg"
>
	{#if thumb}
		<span
			class="thumb"
			class:slide={sliding}
			aria-hidden="true"
			{@attach cssVars({ '--thumb-x': `${thumb.x}px`, '--thumb-w': `${thumb.w}px` })}
		></span>
	{/if}
	{#each options as option (option.value)}
		<label class="opt" class:fit class:bare={!thumb}>
			<RadioGroup.Item value={option.value} disabled={option.disabled} class="radio" />
			{option.label}
		</label>
	{/each}
</RadioGroup.Root>

<!-- Each option is --size-lead tall inside a --space-1 track; its invisible radio's ::after overhangs
     --space-1 up and down (not sideways, into the next option) so the hit area is 44px tall, and
     --size-control keeps it 44px wide, without changing the visual layout. -->
<style>
	:global(.seg) {
		position: relative;
		display: flex;
		width: auto;
		max-width: 100%;
		min-width: 0;
		gap: calc(var(--space-1) / 2);
		padding: var(--space-1);
		border-radius: var(--radius-pill);
		background: var(--muted);
	}

	.thumb {
		position: absolute;
		top: var(--space-1);
		bottom: var(--space-1);
		left: 0;
		width: var(--thumb-w);
		transform: translateX(var(--thumb-x));
		border-radius: var(--radius-pill);
		background: var(--background);
		box-shadow: var(--shadow-1);
		pointer-events: none;
	}

	@media (prefers-reduced-motion: no-preference) {
		.slide {
			transition: transform var(--dur-base) var(--ease-drawer);
		}
	}

	.opt {
		position: relative;
		display: flex;
		flex: 1 0 auto;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		min-height: var(--size-lead);
		min-width: var(--size-control);
		padding-inline: var(--space-1);
		border-radius: var(--radius-pill);
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		font-weight: 500;
		line-height: 1;
		text-align: center;
		white-space: nowrap;
		cursor: pointer;
		user-select: none;
	}

	.opt.fit {
		flex: auto;
		padding-inline: var(--space-2);
		white-space: nowrap;
	}

	.opt:has(:global([data-state='checked'])) {
		color: var(--text);
	}

	.opt.bare:has(:global([data-state='checked'])) {
		background: var(--background);
		box-shadow: var(--shadow-1);
	}

	.opt:has(:global(:focus-visible)) {
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
	}

	.opt:has(:global(:disabled)) {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.opt :global(.radio) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		border-radius: var(--radius-pill);
		background: transparent;
		opacity: 0;
	}

	.opt :global(.radio)::after {
		inset: calc(var(--space-1) * -1) 0;
	}
</style>
