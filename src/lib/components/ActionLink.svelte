<script lang="ts">
	import { resolve } from '$app/paths';

	/** Green text link for section actions ("+ Agregar", "Ver todos"); `href` is an unresolved app path. */
	let {
		href,
		label = 'Agregar',
		onclick
	}: { href: string; label?: string; onclick?: (e: MouseEvent) => void } = $props();
</script>

<a class="action" href={resolve(href as '')} {onclick}
	>{#if label === 'Agregar'}<span aria-hidden="true">+&nbsp;</span>{/if}{label}</a
>

<style>
	.action {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		color: var(--link);
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-decoration: none;
	}
</style>
