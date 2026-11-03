<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Drawer from '$lib/components/ui/drawer/index.js';

	let {
		title,
		open = $bindable(false),
		onclose,
		children
	}: { title: string; open?: boolean; onclose?: () => void; children: Snippet } = $props();
</script>

<!-- No close button: the scrim, a swipe down or Escape close it. The content hugs its height (capped in Drawer.Content). -->
<Drawer.Root bind:open shouldScaleBackground={false} onClose={() => onclose?.()}>
	<Drawer.Content class="mx-auto w-full max-w-[35rem]">
		<Drawer.Title class="px-5 pt-1 pb-3 text-lg leading-snug font-semibold">{title}</Drawer.Title>
		<div class="min-h-0 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
			{@render children()}
		</div>
	</Drawer.Content>
</Drawer.Root>
