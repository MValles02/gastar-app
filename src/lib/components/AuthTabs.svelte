<script lang="ts">
	import { resolve } from '$app/paths';
	import Wordmark from '$lib/components/Wordmark.svelte';

	// Wordmark heading plus the Ingresar / Crear cuenta switch at the top of /login and /signup.
	let { current }: { current: 'login' | 'signup' } = $props();
</script>

<h1 class="brand">
	<Wordmark size="2.25rem" />
</h1>

<nav class="seg" aria-label="Acceso">
	<a href={resolve('/login')} aria-current={current === 'login' ? 'page' : undefined}>Ingresar</a>
	<a href={resolve('/signup')} aria-current={current === 'signup' ? 'page' : undefined}
		>Crear cuenta</a
	>
</nav>

<style>
	.brand {
		margin: 0;
		font: inherit;
		text-align: center;
	}

	.seg {
		display: flex;
		gap: 2px;
		padding: 3px;
		background: var(--muted);
		border-radius: var(--radius);
	}

	.seg a {
		flex: 1;
		display: grid;
		place-items: center;
		min-height: 2.75rem;
		border-radius: calc(var(--radius) - 3px);
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--text-muted);
		text-decoration: none;
	}

	.seg a[aria-current='page'] {
		background: var(--segment-selected);
		color: var(--text);
		box-shadow: var(--shadow-1);
	}
</style>
