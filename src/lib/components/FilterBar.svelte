<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import { markReplace } from '#lib/nav-stack.svelte.ts';
	import { fade } from '#lib/motion.ts';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { es } from '#lib/copy/es.ts';
	import Button from '#lib/components/base/Button.svelte';
	import SearchField from '#lib/components/base/SearchField.svelte';
	import Icon from './Icon.svelte';

	/**
	 * Optional search field + "Filtros" button. The page owns the filters drawer (`onfilters` opens it); `active`
	 * counts the non-default filters (the search term excluded). `filters` is only the no-JS form's fields.
	 */
	let {
		q = '',
		search = true,
		placeholder = es.ui.search,
		label = es.ui.search,
		active,
		filters,
		onfilters,
		tone = 'default'
	}: {
		q?: string;
		/** false: only the Filtros button. */
		search?: boolean;
		placeholder?: string;
		label?: string;
		active: number;
		filters?: Snippet<[() => void]>;
		onfilters: () => void;
		/** `primary`: on a primary band (Movimientos): the field and button get a solid surface fill. */
		tone?: 'default' | 'primary';
	} = $props();

	const mounted = hydrated();

	let searchForm: HTMLFormElement | null = $state(null);
	let timer: ReturnType<typeof setTimeout>;

	// The search form carries the active filters along (only after mount: without JS the noscript form owns them).
	const carried = $derived([...page.url.searchParams].filter(([k]) => k !== 'q' && k !== 'page'));

	const onformdata = (e: FormDataEvent) => {
		for (const [k, v] of [...e.formData]) if (v === '') e.formData.delete(k);
	};
	const debounced = () => {
		clearTimeout(timer);
		timer = setTimeout(() => searchForm?.requestSubmit(), 300);
	};
</script>

<form
	method="GET"
	class="search"
	class:on-primary={tone === 'primary'}
	data-sveltekit-reset="false"
	data-sveltekit-replacestate
	bind:this={searchForm}
	onsubmit={() => markReplace()}
	onchange={() => searchForm?.requestSubmit()}
	{onformdata}
>
	{#if mounted.current}
		{#each carried as [k, v], i (i)}
			<input type="hidden" name={k} value={v} />
		{/each}
	{/if}
	<div class="tools" class:end={!search}>
		{#if search}
			<SearchField
				value={q}
				{placeholder}
				{label}
				oninput={debounced}
				onPrimary={tone === 'primary'}
			/>
		{/if}
		<Button
			variant="outline"
			class="trigger"
			data-active={active > 0 ? '' : undefined}
			aria-haspopup="dialog"
			onclick={onfilters}
		>
			<Icon name="filters" size="sm" />
			{es.ui.filters}
			{#if active > 0}<span class="inline-flex" in:fade><Badge>{active}</Badge></span>{/if}
		</Button>
	</div>
	{#if search}<noscript><Button type="submit">{es.ui.filter}</Button></noscript>{/if}
</form>

{#if filters}
	<noscript>
		<form method="GET" class="plain">
			{#if q}<input type="hidden" name="q" value={q} />{/if}
			{@render filters(() => {})}
			<Button type="submit">{es.ui.applyFilters}</Button>
		</form>
	</noscript>
{/if}

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

	.tools.end {
		justify-content: flex-end;
	}

	.tools :global(.trigger) {
		flex: none;
	}

	.tools :global(.trigger[data-active]) {
		border-color: var(--text);
	}

	/* Outline buttons are translucent in dark mode: no edge on the band. */
	.on-primary .tools :global(.trigger) {
		border-color: transparent;
	}

	.plain {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
</style>
