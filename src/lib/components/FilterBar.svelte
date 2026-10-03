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
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
	}

	.search {
		position: relative;
		flex: 1 1 100%;
	}

	/* Full-width children (segmented control, filters disclosure) take their own row. */
	form > :global(:not(.search, noscript, label)) {
		flex: 1 1 100%;
	}

	/* Checkbox shares the row with the other compact control when it fits. */
	form > :global(label:not(.search)) {
		flex: 0 1 auto;
		min-width: 0;
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
