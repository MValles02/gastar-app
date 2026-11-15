<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import { resolve } from '$app/paths';
	import OptionPicker from '$lib/components/OptionPicker.svelte';

	type Picker = ComponentProps<typeof OptionPicker>['items'];

	let {
		showCategory,
		mounted,
		drawer,
		pickableCategories,
		shown,
		categoryId = $bindable(),
		oncreate
	}: {
		showCategory: boolean;
		mounted: boolean;
		drawer: boolean;
		pickableCategories: Picker;
		shown: Partial<Record<'categoryId', string>>;
		categoryId: string;
		oncreate: () => void;
	} = $props();
</script>

{#snippet newCategoryRow(close: () => void)}
	<button
		type="button"
		class="new-category"
		onclick={() => {
			close();
			oncreate();
		}}><Plus size={18} strokeWidth={2} aria-hidden="true" />Nueva categoría</button
	>
{/snippet}

{#if showCategory}
	<li class:bad={shown.categoryId}>
		{#if !mounted}<p class="hint pad">Solo para ingresos y gastos</p>{/if}
		<OptionPicker
			name="categoryId"
			legend="Categoría"
			title="Categoría"
			items={pickableCategories}
			bind:value={categoryId}
			nested={drawer}
			extra={drawer ? newCategoryRow : undefined}
			placeholder="Elegir"
			error={shown.categoryId}
			errorId="category-error"
		>
			{#snippet empty()}
				{#if drawer}
					<button type="button" class="new-category" onclick={() => oncreate()}
						><Plus size={18} strokeWidth={2} aria-hidden="true" />Nueva categoría</button
					>
				{:else}
					<p class="hint pad">
						Todavía no tenés categorías.
						<a href={resolve('/categories/new')}>Crear categoría</a>
					</p>
				{/if}
			{/snippet}
		</OptionPicker>
	</li>
{/if}

<style>
	/* Below the category card: a left-aligned, bold link-coloured row with a plus. */
	.new-category {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 10px;
		width: 100%;
		min-height: 52px;
		margin-top: var(--space-1);
		padding: 0 var(--space-4);
		border: 0;
		background: transparent;
		text-align: left;
		font-size: var(--font-size-base);
		font-weight: 600;
		color: var(--link);
	}

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.hint.pad {
		padding: var(--space-3) var(--space-4);
	}
</style>
