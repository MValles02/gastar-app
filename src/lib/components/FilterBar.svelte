<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		q = '',
		placeholder = 'Buscar',
		label = 'Buscar',
		children
	}: { q?: string; placeholder?: string; label?: string; children?: Snippet } = $props();

	let form: HTMLFormElement;
	let timer: ReturnType<typeof setTimeout>;

	const submit = () => form.requestSubmit();
	const debounced = () => {
		clearTimeout(timer);
		timer = setTimeout(submit, 300);
	};
</script>

<form
	method="GET"
	data-sveltekit-keepfocus
	data-sveltekit-replacestate
	bind:this={form}
	onchange={submit}
>
	<label class="search">
		<span class="visually-hidden">{label}</span>
		<span class="icon"><Icon name="search" size="1.25rem" /></span>
		<input type="search" name="q" value={q} {placeholder} oninput={debounced} />
	</label>
	{#if children}{@render children()}{/if}
	<noscript><button type="submit">Filtrar</button></noscript>
</form>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.search {
		position: relative;
	}

	.icon {
		position: absolute;
		top: 50%;
		left: var(--space-4);
		transform: translateY(-50%);
		display: inline-flex;
		color: var(--text-muted);
		pointer-events: none;
	}

	.search input {
		padding-left: calc(var(--space-4) + 1.25rem + var(--space-2));
	}
</style>
