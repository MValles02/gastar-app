<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import Lock from '@lucide/svelte/icons/lock';
	import Plus from '@lucide/svelte/icons/plus';
	import { resolve } from '$app/paths';
	import OptionPicker from '$lib/components/OptionPicker.svelte';

	type Picker = ComponentProps<typeof OptionPicker>['items'];

	let {
		showCategory,
		mounted,
		drawer,
		recurring,
		categories,
		pickableCategories,
		shown,
		categoryId = $bindable(),
		oncreate
	}: {
		showCategory: boolean;
		mounted: boolean;
		drawer: boolean;
		recurring?: { id: string; type: string; description: string };
		categories: Picker;
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
	<li class:bad={shown.categoryId && !recurring}>
		{#if !mounted}<p class="hint pad">Solo para ingresos y gastos</p>{/if}
		{#if recurring}
			<!-- The payment always takes the rule's category (the server ignores any other). -->
			<input type="hidden" name="categoryId" value={categoryId} />
			<p class="row locked">
				<span class="k">Categoría</span>
				<span class="v">
					{categories.find((c) => c.id === categoryId)?.name ?? ''}
					{#if !drawer}<Lock size={16} strokeWidth={1.75} aria-hidden="true" />{/if}
				</span>
			</p>
			{#if !drawer}<p class="hint pad">Se registra en la categoría del pago.</p>{/if}
		{:else}
			<OptionPicker
				variant="row"
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
		{/if}
	</li>
{/if}

<style>
	.row {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-base);
		color: var(--text);
	}

	.locked {
		justify-content: space-between;
		color: var(--text-muted);
	}

	/* The drawer shows the rule's category like any other row (no lock, normal label). */
	:global(.drawer) .locked {
		color: var(--text);
	}

	.locked .v {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text);
	}

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
