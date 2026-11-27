<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { drawerHref, drawerOf } from '#lib/drawer-routes.ts';
	import { replaceGoto } from '#lib/nav-stack.svelte.ts';

	// A drawer route has no page of its own: client navigations open it as a drawer, so reaching this
	// page means a direct load (the server redirects those) or a missed click; send it to its parent.
	onMount(() => {
		const key = drawerOf(page.route.id);
		if (key) void replaceGoto(drawerHref(key, page.url));
	});
</script>
