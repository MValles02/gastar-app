<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import Icon from '#lib/components/Icon.svelte';

	/** Empty placeholder: icon, one line of text and optional actions (`children`). */
	let {
		icon,
		description,
		children
	}: {
		icon: ComponentProps<typeof Icon>['name'];
		description: string;
		children?: Snippet;
	} = $props();
</script>

<Empty.Root>
	<Empty.Header>
		<Empty.Media variant="icon"><Icon name={icon} size="1rem" /></Empty.Media>
		<Empty.Description>{description}</Empty.Description>
	</Empty.Header>
	{#if children}<Empty.Content>{@render children()}</Empty.Content>{/if}
</Empty.Root>
