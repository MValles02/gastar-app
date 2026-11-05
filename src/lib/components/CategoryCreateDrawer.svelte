<script lang="ts" module>
	import type { CreatedCategory as Created } from '../../routes/(app)/categories/CategoryForm.svelte';

	export type CreatedCategory = Created;
</script>

<script lang="ts">
	import CategoryForm from '../../routes/(app)/categories/CategoryForm.svelte';
	import BottomDrawer from './BottomDrawer.svelte';

	/**
	 * "Nueva categoría" as a drawer: stacked over the movement drawer ("+ Nueva categoría", `nested`) or
	 * opened over the Categorías list (`nested={false}`, `onclose` leaves its history entry). It posts to
	 * the existing `/categories/new` action and hands the created category back (id from the redirect).
	 */
	let {
		open = $bindable(false),
		defaultKind,
		nested = true,
		oncreated,
		onclose
	}: {
		open?: boolean;
		/** Preselected "Se usa para": the movement's type. */
		defaultKind: 'income' | 'outcome';
		nested?: boolean;
		oncreated: (category: CreatedCategory) => void;
		/** When set, the owner closes the drawer (e.g. history.back()) instead of `open = false`. */
		onclose?: () => void;
	} = $props();

	const close = () => (onclose ? onclose() : (open = false));
</script>

<BottomDrawer title="Nueva categoría" {nested} bind:open {onclose}>
	<!-- Rendered only while open, so every opening starts blank with the movement's kind. -->
	{#if open}
		<CategoryForm
			variant="drawer"
			initial={{ kind: defaultKind }}
			oncreated={(created) => {
				oncreated(created);
				if (!onclose) open = false;
			}}
			onclose={close}
		/>
	{/if}
</BottomDrawer>
