<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import CategoryForm, {
		type CreatedCategory
	} from '#lib/components/categories/CategoryForm.svelte';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import { closeAfterSave } from '#lib/components/forms/form-enhance.ts';
	import type { ActionData } from './$types';

	/**
	 * "Nueva categoría": the /categories/new page, a drawer over the Categorías list (shallow route,
	 * `onclose`), or, with `oncreated`, a drawer stacked over the movement drawer's form (`bind:open`;
	 * `oncreated` hands the new category back). All post to the `/categories/new` action.
	 */
	let {
		form,
		open = $bindable(true),
		defaultKind = 'outcome',
		oncreated,
		onclose
	}: {
		form?: ActionData;
		open?: boolean;
		/** Preselected "Se usa para": the movement's type. */
		defaultKind?: 'income' | 'outcome';
		oncreated?: (category: CreatedCategory) => void;
		onclose?: () => void;
	} = $props();

	// Stacked over a movement form (page or drawer): a sub-task drawer this screen opens and closes.
	const stacked = untrack(() => !!oncreated && !onclose);

	async function created(category: CreatedCategory) {
		if (onclose) return closeAfterSave(onclose)();
		oncreated?.(category);
		open = false;
	}
</script>

<FormScreen
	title="Nueva categoría"
	close={{ href: resolve('categories') }}
	bind:open
	onclose={stacked ? () => (open = false) : onclose}
>
	{#if stacked || onclose}
		<!-- Stacked: rendered only while open, so every opening starts blank with the movement's kind. -->
		{#if open}
			<CategoryForm initial={{ kind: defaultKind }} oncreated={created} />
		{/if}
	{:else}
		<CategoryForm initial={form?.values ?? {}} errors={form?.errors} />
	{/if}
</FormScreen>
