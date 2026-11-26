<script lang="ts" module>
	import type { CategoryIconKey, SwatchKey } from '#lib/appearance.ts';

	export type CreatedCategory = {
		id: string;
		name: string;
		icon: CategoryIconKey;
		color: SwatchKey;
		kind: 'income' | 'outcome' | null;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { KIND_OPTIONS } from '#lib/movement.ts';
	import { createdId } from '#lib/toast-flags.ts';
	import { CATEGORY_ICONS, toCategoryIconKey } from '#lib/appearance.ts';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import { formScreen } from '#lib/components/forms/form-enhance.ts';
	import GlyphNameHead from '#lib/components/GlyphNameHead.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';

	type Values = Partial<Record<'name' | 'color' | 'icon' | 'kind', string | null>>;
	type Errors = Partial<Record<keyof Values, string>>;

	/**
	 * The new-category form. In a drawer (the enclosing FormScreen's context), Guardar waits for a
	 * name, posts to /categories/new and hands the created category to `oncreated` instead of
	 * navigating. Otherwise it is the /categories/new page.
	 */
	let {
		initial = {},
		errors = {},
		oncreated,
		onclose
	}: {
		initial?: Values;
		errors?: Errors;
		/** Drawer: the category was created. */
		oncreated?: (category: CreatedCategory) => void;
		/** Drawer: Cancelar. */
		onclose?: () => void;
	} = $props();

	const drawer = formScreen().variant === 'drawer';
	const kindOptions = [...KIND_OPTIONS, { value: '', label: 'Ambos' }];

	let name = $state(untrack(() => initial.name ?? ''));
	let color = $state(untrack(() => (initial.color ?? 'green') as SwatchKey));
	let icon = $state(untrack(() => toCategoryIconKey(initial.icon ?? null) ?? 'tag'));
	let kind = $state(untrack(() => initial.kind ?? ''));

	// Errors from the drawer's post; the page shows the server-rendered `errors` instead.
	let fieldErrors = $state<Errors>({});
	const shown = $derived({ ...errors, ...fieldErrors });
	const firstError = $derived(Object.values(shown).find(Boolean));

	function created(location: string) {
		oncreated?.({
			id: createdId(location),
			name: name.trim(),
			icon,
			color,
			kind: kind === 'income' || kind === 'outcome' ? kind : null
		});
	}
</script>

<FormShell
	action={drawer ? resolve('categories/new') : ''}
	{errors}
	onsubmit={() => (fieldErrors = {})}
	onfailure={(data: { errors?: Errors }) => (fieldErrors = data.errors ?? {})}
	onsaved={drawer ? created : undefined}
	{onclose}
	errorToast="No se pudo crear la categoría."
	cancelHref="/categories"
	canSave={!!name.trim()}
>
	<GlyphNameHead
		bind:name
		bind:icon
		bind:color
		icons={CATEGORY_ICONS}
		placeholder="Ej.: Supermercado"
		invalid={!!shown.name}
		describedby={firstError ? 'category-error' : undefined}
	/>
	{#if firstError}<p class="error" id="category-error" role="alert">{firstError}</p>{/if}

	<div class="kind">
		<span id="category-kind-label" class="label">Se usa para</span>
		<SegmentedControl
			name="kind"
			options={kindOptions}
			bind:value={kind}
			labelledby="category-kind-label"
		/>
	</div>
</FormShell>

<style>
	/* Label above, the control across the full row, so the options do not squeeze and wrap. */
	.kind {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-muted);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
