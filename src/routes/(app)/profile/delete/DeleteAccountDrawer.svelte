<script lang="ts">
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import DeleteForm from './DeleteForm.svelte';
	import type { PageData } from './$types';

	// "¿Darte de baja?" opened over Perfil. The /profile/delete page renders the same form.
	let { data, onclose }: { data: PageData; onclose: () => void } = $props();
</script>

<BottomDrawer title="¿Darte de baja?" open {onclose}>
	<DeleteForm variant="drawer" summary={data.summary} {onclose} />
</BottomDrawer>
