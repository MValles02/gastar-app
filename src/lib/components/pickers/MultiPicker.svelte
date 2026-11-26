<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import type { SwatchKey } from '#lib/appearance.ts';
	import IconBadge from '#lib/components/IconBadge.svelte';
	import * as Item from '#lib/components/ui/item/index.js';
	import { ARCHIVED_LABEL } from '#lib/movement.ts';
	import Picker from './Picker.svelte';

	/**
	 * A row that opens a stacked list of toggle rows (several can be selected). Empty selection reads
	 * "Todas". Toggling keeps the list open; the check sits left of the row's right-hand meta.
	 */
	let {
		legend,
		title,
		plural,
		items,
		value = $bindable()
	}: {
		legend: string;
		title: string;
		/** Summary noun for two or more selected ("cuentas" gives "2 cuentas"). */
		plural: string;
		items: {
			id: string;
			name: string;
			icon: ComponentProps<typeof IconBadge>['icon'];
			color: SwatchKey | null;
			meta?: string;
			archived?: boolean;
		}[];
		value: string[];
	} = $props();

	const labelId = $props.id();

	const summary = $derived(
		value.length === 0
			? 'Todas'
			: value.length === 1
				? (items.find((i) => i.id === value[0])?.name ?? '1')
				: `${value.length} ${plural}`
	);

	const toggle = (id: string) => {
		value = value.includes(id) ? value.filter((v) => v !== id) : [...value, id];
	};
</script>

<div class="field">
	<Picker
		{labelId}
		label={legend}
		{title}
		value={summary}
		placeholder={value.length === 0}
		scrollMargin={false}
		valueClass="truncate"
	>
		<div class="options">
			{#each items as item (item.id)}
				{@const on = value.includes(item.id)}
				<Item.Root>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="opt text-left {props.class}"
							data-value={item.id}
							aria-pressed={on}
							onclick={() => toggle(item.id)}
						>
							<Item.Media><IconBadge icon={item.icon} color={item.color} /></Item.Media>
							<Item.Content>
								<Item.Title>{item.name}</Item.Title>
								{#if item.archived}<Item.Description>{ARCHIVED_LABEL}</Item.Description>{/if}
							</Item.Content>
							{#if on || item.meta}
								<Item.Actions class="text-muted-foreground text-sm">
									{#if on}<Check
											size={20}
											strokeWidth={1.75}
											aria-hidden="true"
											class="text-foreground"
										/>{/if}
									{item.meta ?? ''}
								</Item.Actions>
							{/if}
						</button>
					{/snippet}
				</Item.Root>
			{/each}
		</div>
	</Picker>
</div>

<style>
	.options {
		display: flex;
		flex-direction: column;
	}
</style>
