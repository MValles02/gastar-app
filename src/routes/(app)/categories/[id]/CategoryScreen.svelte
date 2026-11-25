<script lang="ts">
	import { resolve } from '$app/paths';
	import FormScreen from '#lib/components/forms/FormScreen.svelte';
	import { patchShallow } from '#lib/open-shallow.ts';
	import CategoryDetail from './CategoryDetail.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form, onclose }: { data: PageData; form?: ActionData; onclose?: () => void } =
		$props();

	// A reload (archive, Deshacer, the drawer's refresh) brings the stored category back in; a save sets it at once.
	let detail = $derived({ category: data.category, disabledKinds: data.disabledKinds });
</script>

<FormScreen
	title={detail.category.name}
	back={{ href: resolve('categories'), label: 'Volver a categorías', text: 'Categorías' }}
	{onclose}
>
	<CategoryDetail
		{data}
		{detail}
		formError={form?.formError}
		onsaved={(next) => {
			detail = next;
			patchShallow('category', next);
		}}
	/>
</FormScreen>
