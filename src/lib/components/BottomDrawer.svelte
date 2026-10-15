<script lang="ts">
	import type { Snippet } from 'svelte';
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Drawer from '$lib/components/ui/drawer/index.js';

	let {
		title,
		open = $bindable(false),
		onclose,
		children
	}: { title: string; open?: boolean; onclose?: () => void; children: Snippet } = $props();
</script>

<Drawer.Root bind:open shouldScaleBackground={false} onClose={() => onclose?.()}>
	<Drawer.Content class="mx-auto w-full max-w-[35rem]">
		<Drawer.Header class="flex-row items-center justify-between">
			<Drawer.Title>{title}</Drawer.Title>
			<Drawer.Close>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="icon" aria-label="Cerrar">
						<XIcon aria-hidden="true" />
					</Button>
				{/snippet}
			</Drawer.Close>
		</Drawer.Header>
		<div class="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
			{@render children()}
		</div>
	</Drawer.Content>
</Drawer.Root>
