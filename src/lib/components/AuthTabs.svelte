<script lang="ts">
	import { resolve } from '$app/paths';

	// The Ingresar / Crear cuenta switch at the top of /login and /signup.
	let { current }: { current: 'login' | 'signup' } = $props();

	const tabs = [
		{ key: 'login', href: resolve('login'), label: 'Ingresar' },
		{ key: 'signup', href: resolve('signup'), label: 'Crear cuenta' }
	] as const;
</script>

<nav aria-label="Acceso" class="bg-muted flex w-full gap-0.5 rounded-lg p-[3px]">
	{#each tabs as tab (tab.key)}
		<a
			href={tab.href}
			aria-current={current === tab.key ? 'page' : undefined}
			class="text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground focus-visible:ring-ring/50 flex min-h-11 flex-1 no-underline items-center justify-center rounded-md px-1 text-center text-sm font-medium focus-visible:ring-3 aria-[current=page]:shadow-sm"
			>{tab.label}</a
		>
	{/each}
</nav>
