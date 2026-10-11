<script lang="ts">
	import { resolve } from '$app/paths';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';

	// Wordmark heading plus the Ingresar / Crear cuenta switch at the top of /login and /signup.
	let { current }: { current: 'login' | 'signup' } = $props();
</script>

<h1 class="brand">
	<Wordmark size="2.25rem" />
</h1>

<nav aria-label="Acceso">
	<ButtonGroup.Root class="w-full">
		<Button
			href={resolve('/login')}
			variant={current === 'login' ? 'default' : 'outline'}
			class="flex-1"
			aria-current={current === 'login' ? 'page' : undefined}>Ingresar</Button
		>
		<Button
			href={resolve('/signup')}
			variant={current === 'signup' ? 'default' : 'outline'}
			class="flex-1"
			aria-current={current === 'signup' ? 'page' : undefined}>Crear cuenta</Button
		>
	</ButtonGroup.Root>
</nav>

<style>
	.brand {
		margin: 0;
		font: inherit;
		text-align: center;
	}
</style>
