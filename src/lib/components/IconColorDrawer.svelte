<script lang="ts" generics="Key extends string">
	import type { ComponentProps } from 'svelte';
	import { SWATCHES, type SwatchKey } from '$lib/appearance';
	import BottomDrawer from './BottomDrawer.svelte';
	import Icon from './Icon.svelte';
	import IconBadge from './IconBadge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';

	/**
	 * "Ícono y color": a drawer stacked over the one that opened it. The choice is staged here (live
	 * preview) and handed to `onpick` by Listo; Cancelar, the scrim or Escape discard it. The caller
	 * decides what a pick means: autosave on a detail screen, plain form state on a "new" drawer.
	 */
	let {
		open = $bindable(false),
		nested = true,
		icons,
		icon,
		color,
		onpick
	}: {
		open?: boolean;
		/** Stacked over a drawer (default); false when opened from a page. */
		nested?: boolean;
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

<BottomDrawer title="Ícono y color" {nested} bind:open>
	<div class="body">
		<div class="preview">
			<IconBadge icon={glyph(stagedIcon)} color={stagedColor} size="4rem" />
		</div>

		<RadioGroup.Root bind:value={stagedIcon} aria-label="Ícono" class="grid grid-cols-6 gap-y-1">
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
						<IconBadge icon={glyph(option.key)} color={stagedColor} />
					</span>
				</Label>
			{/each}
		</RadioGroup.Root>

		<!-- 8 per row; each cell is 44px tall (36px circle + padding) so the hit area stays a touch target. -->
		<RadioGroup.Root
			bind:value={stagedColor}
			aria-label="Color"
			class="grid w-full grid-cols-8 gap-x-2 gap-y-0.5 p-1"
		>
			{#each SWATCHES as option (option.key)}
				<Label class="group relative flex cursor-pointer justify-center py-1">
					<RadioGroup.Item
						value={option.key}
						aria-label={option.label}
						class="absolute inset-0 size-full rounded-full border-0 opacity-0"
					/>
					<span
						class="group-has-data-[state=checked]:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--sw)] group-has-focus-visible:outline-ring block aspect-square w-full max-w-9 rounded-full group-has-focus-visible:outline-2 group-has-focus-visible:outline-offset-[6px]"
						style:--sw="var(--swatch-{option.key})"
						style:background="var(--sw)"
					></span>
				</Label>
			{/each}
		</RadioGroup.Root>

		<div class="actions">
			<Button
				type="button"
				variant="outline"
				class="h-auto min-h-11 min-w-0 flex-1 basis-0"
				onclick={() => (open = false)}>Cancelar</Button
			>
			<Button type="button" class="h-auto min-h-11 min-w-0 flex-1 basis-0" onclick={done}
				>Listo</Button
			>
		</div>
	</div>
</BottomDrawer>

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
</style>
