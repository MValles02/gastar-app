<script lang="ts">
	import type { Snippet } from 'svelte';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import { page } from '$app/state';
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import { markReplace } from '#lib/nav-stack.svelte.ts';
	import { fade } from '#lib/motion.ts';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import Icon from './Icon.svelte';

	/**
	 * Optional search field + "Filtros" button. The page owns the filters drawer (`onfilters` opens it); `active`
	 * counts the non-default filters (the search term excluded). `filters` is only the no-JS form's fields.
	 */
	let {
		q = '',
		search = true,
		placeholder = 'Buscar',
		label = 'Buscar',
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
	<div class="tools">
		{#if search}
			<InputGroup.Root class="h-11 flex-1 rounded-xl">
				<InputGroup.Addon>
					<Icon name="search" size="md" />
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
		{/if}
		<Button
			type="button"
			variant="outline"
			class={[
				'h-11 shrink-0 px-3.5 font-medium',
				!search && 'ml-auto',
				active > 0 && 'border-foreground'
			]}
			aria-haspopup="dialog"
			onclick={onfilters}
		>
			<SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
			Filtros
			{#if active > 0}<span class="inline-flex" in:fade><Badge>{active}</Badge></span>{/if}
		</Button>
	</div>
	{#if search}<noscript><Button type="submit">Filtrar</Button></noscript>{/if}
</form>

{#if filters}
	<noscript>
		<form method="GET" class="plain">
			{#if q}<input type="hidden" name="q" value={q} />{/if}
			{@render filters(() => {})}
			<Button type="submit">Aplicar filtros</Button>
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

	/* Fields and outline buttons are translucent in dark mode: solid surface so the band never shows through. */
	.on-primary :global([data-slot='input-group']),
	.on-primary :global([data-slot='button']) {
		background: var(--surface);
		border-color: transparent;
	}

	.on-primary :global([data-slot='input-group']:focus-within) {
		--tw-ring-color: var(--on-primary);
	}

	.plain {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
</style>
