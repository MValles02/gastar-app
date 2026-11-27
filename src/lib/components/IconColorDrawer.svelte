<script lang="ts" generics="Key extends string">
	import type { ComponentProps } from 'svelte';
	import { SWATCHES, type SwatchKey } from '#lib/appearance.ts';
	import Sheet from '#lib/components/base/Sheet.svelte';
	import Button from '#lib/components/base/Button.svelte';
	import { es } from '#lib/copy/es.ts';
	import Icon from './Icon.svelte';
	import Glyph from '#lib/components/base/Glyph.svelte';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';

	/**
	 * "Ícono y color": a drawer stacked over the one that opened it. The choice is staged here (live
	 * preview) and handed to `onpick` by Listo; Cancelar, the scrim or Escape discard it. The caller
	 * decides what a pick means: autosave on a detail screen, plain form state on a "new" drawer.
	 */
	let {
		open = $bindable(false),
		icons,
		icon,
		color,
		onpick
	}: {
		open?: boolean;
		/** The icon set: ACCOUNT_ICONS or CATEGORY_ICONS. */
		icons: readonly { key: Key; label: string }[];
		/** Current choice, staged again every time the drawer opens. */
		icon: Key;
		color: SwatchKey;
		onpick: (pick: { icon: Key; color: SwatchKey }) => void;
	} = $props();

	let stagedIcon = $state<Key>('' as Key);
	let stagedColor = $state<SwatchKey>('green');

	$effect(() => {
		if (!open) return;
		stagedIcon = icon;
		stagedColor = color;
	});

	const glyph = (key: Key) => key as ComponentProps<typeof Icon>['name'];

	function done() {
		onpick({ icon: stagedIcon, color: stagedColor });
		open = false;
	}
</script>

<Sheet title={es.ui.iconColor.title} bind:open>
	<div class="body">
		<div class="preview">
			<Glyph icon={glyph(stagedIcon)} tone={stagedColor} size="hero" />
		</div>

		<RadioGroup.Root
			bind:value={stagedIcon}
			aria-label={es.ui.iconColor.icon}
			class="grid grid-cols-6 gap-y-1"
		>
			{#each icons as option (option.key)}
				<Label class="relative flex cursor-pointer justify-center py-1">
					<RadioGroup.Item
						value={option.key}
						aria-label={option.label}
						class="peer absolute inset-0 size-full rounded-full border-0 opacity-0"
					/>
					<span
						class="peer-focus-visible:outline-ring peer-data-[state=checked]:ring-foreground peer-data-[state=checked]:ring-offset-background rounded-full peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-offset-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4"
					>
						<Glyph icon={glyph(option.key)} tone={stagedColor} />
					</span>
				</Label>
			{/each}
		</RadioGroup.Root>

		<!-- 8 per row; each cell is 44px tall (36px circle + padding) so the hit area stays a touch target. -->
		<RadioGroup.Root
			bind:value={stagedColor}
			aria-label={es.ui.iconColor.color}
			class="grid w-full grid-cols-8 gap-x-2 gap-y-0.5 p-1"
		>
			{#each SWATCHES as option (option.key)}
				<Label class="group relative flex cursor-pointer justify-center py-1">
					<RadioGroup.Item
						value={option.key}
						aria-label={option.label}
						class="absolute inset-0 size-full rounded-full border-0 opacity-0"
					/>
					<span class="dot" data-tone={option.key}></span>
				</Label>
			{/each}
		</RadioGroup.Root>

		<div class="actions">
			<Button variant="outline" class="action" onclick={() => (open = false)}>{es.ui.cancel}</Button
			>
			<Button class="action" onclick={done}>{es.ui.done}</Button>
		</div>
	</div>
</Sheet>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.preview {
		display: flex;
		justify-content: center;
	}

	.actions {
		display: flex;
		gap: var(--space-3);
	}

	.actions :global(.action) {
		flex: 1 1 0;
		min-width: 0;
	}

	.dot {
		display: block;
		aspect-ratio: 1;
		width: 100%;
		max-width: var(--size-lead);
		border-radius: var(--radius-pill);
		background: var(--tone);
	}

	:global([data-state='checked']) ~ .dot {
		box-shadow:
			0 0 0 2px var(--surface),
			0 0 0 4px var(--tone);
	}

	:global(:focus-visible) ~ .dot {
		outline: 2px solid var(--ring);
		outline-offset: 6px;
	}
</style>
