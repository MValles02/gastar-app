<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	/**
	 * Search form (GET, auto-submits on change). `trailing` sits next to the search field,
	 * `children` take their own row below. `hidden` keeps the other active params in the URL.
	 */
	let {
		q = '',
		placeholder = 'Buscar',
		label = 'Buscar',
		hidden = {},
		trailing,
		children
	}: {
		q?: string;
		placeholder?: string;
		label?: string;
		hidden?: Record<string, string>;
		trailing?: Snippet;
		children?: Snippet;
	} = $props();

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
	{#each Object.entries(hidden) as [k, v] (k)}
		{#if v}<input type="hidden" name={k} value={v} />{/if}
	{/each}
	<div class="tools">
		<label class="search">
			<span class="visually-hidden">{label}</span>
			<span class="icon"><Icon name="search" size="1.25rem" /></span>
			<input type="search" name="q" value={q} {placeholder} oninput={debounced} />
		</label>
		{#if trailing}{@render trailing()}{/if}
	</div>
	{#if children}{@render children()}{/if}
	<noscript><button type="submit">Filtrar</button></noscript>
</form>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.tools {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.search {
		position: relative;
		flex: 1;
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
