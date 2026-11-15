<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { refreshAll } from '$app/navigation';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import CategoryForm, { type CreatedCategory } from './CategoryForm.svelte';

	/**
	 * "Nueva categoría" as a drawer. Stacked over the movement drawer's form (`bind:open`, `oncreated`
	 * hands the new category back), or, with `onclose`, opened over the Categorías list as a shallow
	 * route that the owner closes. Both post to the `/categories/new` action.
	 */
	let {
		open = $bindable(true),
		defaultKind = 'outcome',
		oncreated,
		onclose
	}: {
		open?: boolean;
		/** Preselected "Se usa para": the movement's type. */
		defaultKind?: 'income' | 'outcome';
		oncreated?: (category: CreatedCategory) => void;
		onclose?: () => void;
	} = $props();

	async function created(category: CreatedCategory) {
		if (!onclose) {
			oncreated?.(category);
			open = false;
			return;
		}
		// Refresh before the pop: a popstate landing first reuses the stale loads.
		await refreshAll();
		onclose();
		toast.success('Guardado.');
	}
</script>

<BottomDrawer title="Nueva categoría" nested={!onclose} bind:open {onclose}>
	<!-- Rendered only while open, so every opening starts blank with the movement's kind. -->
	{#if open}
		<CategoryForm
			variant="drawer"
			initial={{ kind: defaultKind }}
			oncreated={created}
			onclose={onclose ?? (() => (open = false))}
		/>
	{/if}
</BottomDrawer>
