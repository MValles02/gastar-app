<script lang="ts">
	import { onMount, tick, type Snippet } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import Icon from './Icon.svelte';

	/**
	 * Search field + "Filtros" button. Every other filter lives in the drawer (`filters`), which applies
	 * on change by navigating to `path`. `active` counts the non-default filters (the search term excluded).
	 * `filters` gets a callback to apply right away: Bits radios and checkboxes fire no native change event.
	 */
	let {
		q = '',
		placeholder = 'Buscar',
		label = 'Buscar',
		path,
		active,
		filters
	}: {
		q?: string;
		placeholder?: string;
		label?: string;
		path: string;
		active: number;
		filters: Snippet<[() => void]>;
	} = $props();

	let mounted = $state(false);
	onMount(() => (mounted = true));

	let open = $state(false);
	let drawerForm: HTMLFormElement | null = $state(null);
	let searchForm: HTMLFormElement | null = $state(null);
	let timer: ReturnType<typeof setTimeout>;

	// The search form carries the active filters along (only after mount: without JS the noscript form owns them).
	const carried = $derived([...page.url.searchParams].filter(([k]) => k !== 'q' && k !== 'page'));

	// Drop empty params so the URL only carries what is set.
	const onformdata = (e: FormDataEvent) => {
		for (const [k, v] of [...e.formData]) if (v === '') e.formData.delete(k);
	};
	const debounced = () => {
		clearTimeout(timer);
		timer = setTimeout(() => searchForm?.requestSubmit(), 300);
	};

	// The drawer is portaled out of the app root, so SvelteKit does not intercept its GET form:
	// navigate by hand.
	const apply = (e: SubmitEvent) => {
		e.preventDefault();
		const sp = new SvelteURLSearchParams();
		for (const [k, v] of new FormData(drawerForm!)) if (typeof v === 'string' && v) sp.set(k, v);
		void goto(resolve(`${path}?${sp}` as '/'), { keepFocus: true, replaceState: true });
	};
	const submit = () => tick().then(() => drawerForm?.requestSubmit());
	const clear = () =>
		void goto(resolve(`${path}?q=${encodeURIComponent(q)}` as '/'), { keepFocus: true });
</script>

<form
	method="GET"
	class="search"
	data-sveltekit-keepfocus
	data-sveltekit-replacestate
	bind:this={searchForm}
	onchange={() => searchForm?.requestSubmit()}
	{onformdata}
>
	{#if mounted}
		{#each carried as [k, v], i (i)}
			<input type="hidden" name={k} value={v} />
		{/each}
	{/if}
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
		<Button
			type="button"
			variant="outline"
			class={['shrink-0', active > 0 && 'border-foreground']}
			aria-haspopup="dialog"
			onclick={() => (open = true)}
		>
			<SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
			Filtros
			{#if active > 0}<Badge>{active}</Badge>{/if}
		</Button>
	</div>
	<noscript><Button type="submit">Filtrar</Button></noscript>
</form>

<noscript>
	<form method="GET" class="plain">
		{#if q}<input type="hidden" name="q" value={q} />{/if}
		{@render filters(() => {})}
		<Button type="submit">Aplicar filtros</Button>
	</form>
</noscript>

<BottomDrawer title="Filtros" bind:open>
	<form method="GET" class="drawer-form" bind:this={drawerForm} onchange={submit} onsubmit={apply}>
		{#if q}<input type="hidden" name="q" value={q} />{/if}
		{@render filters(submit)}
		{#if active > 0}
			<Button type="button" variant="outline" class="w-full" onclick={clear}>
				Limpiar filtros
			</Button>
		{/if}
	</form>
</BottomDrawer>

<style>
	.search {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.tools {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	/* Drawer content is portaled, so the form needs its own layout (scoped styles still apply to its own nodes). */
	.drawer-form,
	.plain {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
</style>
