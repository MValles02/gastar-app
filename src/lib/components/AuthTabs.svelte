<script lang="ts">
	import { resolve } from '$app/paths';
	import Wordmark from '$lib/components/Wordmark.svelte';

	// Wordmark heading plus the Ingresar / Crear cuenta switch at the top of /login and /signup.
	let { current }: { current: 'login' | 'signup' } = $props();

	const tabs = [
		{ key: 'login', href: resolve('/login'), label: 'Ingresar' },
		{ key: 'signup', href: resolve('/signup'), label: 'Crear cuenta' }
	] as const;
</script>

<h1 class="brand">
	<Wordmark size="2.25rem" />
</h1>

<nav aria-label="Acceso" class="bg-muted flex w-full gap-0.5 rounded-lg p-[3px]">
	{#each tabs as tab (tab.key)}
		<a
			href={tab.href}
			aria-current={current === tab.key ? 'page' : undefined}
			class="text-muted-foreground aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground focus-visible:ring-ring/50 flex min-h-9 flex-1 items-center justify-center rounded-md px-1 text-center text-sm font-medium focus-visible:ring-3 aria-[current=page]:shadow-sm"
			>{tab.label}</a
		>
	{/each}
</nav>

<style>
	.brand {
		margin: 0;
		font: inherit;
		text-align: center;
	}
</style>
