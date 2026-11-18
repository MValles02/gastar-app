<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import CategoryForm, {
		type CreatedCategory
	} from '#lib/components/categories/CategoryForm.svelte';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import { closeAfterSave, setFormScreen } from '#lib/components/forms/form-enhance.ts';
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

	// Stacked over a movement form (page or drawer): its own drawer context for the form inside.
	if (untrack(() => oncreated && !onclose)) setFormScreen({ variant: 'drawer' });

	async function created(category: CreatedCategory) {
		if (onclose) return closeAfterSave(onclose)();
		oncreated?.(category);
		open = false;
	}
</script>

{#if oncreated && !onclose}
	<BottomDrawer title="Nueva categoría" nested bind:open>
		<!-- Rendered only while open, so every opening starts blank with the movement's kind. -->
		{#if open}
			<CategoryForm
				initial={{ kind: defaultKind }}
				oncreated={created}
				onclose={() => (open = false)}
			/>
		{/if}
	</BottomDrawer>
{:else}
	<FormScreen title="Nueva categoría" close={{ href: resolve('categories') }} {onclose}>
		{#if onclose}
			<CategoryForm initial={{ kind: defaultKind }} oncreated={created} {onclose} />
		{:else}
			<CategoryForm initial={form?.values ?? {}} errors={form?.errors} />
		{/if}
	</FormScreen>
{/if}
