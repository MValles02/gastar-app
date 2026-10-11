<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
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

	// Drop empty params (q=, currency=) so the URL only carries what is set.
	const onformdata = (e: FormDataEvent) => {
		for (const [k, v] of [...e.formData]) if (v === '') e.formData.delete(k);
	};
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
	{onformdata}
>
	{#each Object.entries(hidden) as [k, v] (k)}
		{#if v}<input type="hidden" name={k} value={v} />{/if}
	{/each}
	<div class="tools">
		<InputGroup.Root class="flex-1">
			<InputGroup.Addon>
				<Icon name="search" size="1.25rem" />
			</InputGroup.Addon>
			<InputGroup.Input
				type="search"
				name="q"
				value={q}
				{placeholder}
				aria-label={label}
				oninput={debounced}
			/>
		</InputGroup.Root>
		{#if trailing}{@render trailing()}{/if}
	</div>
	{#if children}{@render children()}{/if}
	<noscript><Button type="submit">Filtrar</Button></noscript>
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
</style>
