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
	import { NAME_MAX_LENGTH } from '#lib/fields.ts';
	import { KIND_OPTIONS } from '#lib/movement.ts';
	import { createdId } from '#lib/toast-flags.ts';
	import { CATEGORY_ICONS, toCategoryIconKey } from '#lib/appearance.ts';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import IconBadge from '#lib/components/IconBadge.svelte';
	import IconColorDrawer from '#lib/components/IconColorDrawer.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';

	type Values = Partial<Record<'name' | 'color' | 'icon' | 'kind', string | null>>;
	type Errors = Partial<Record<keyof Values, string>>;

	/**
	 * The new-category form. `drawer`: inside a drawer (Guardar waits for a name, posts to
	 * /categories/new and hands the created category to `oncreated` instead of navigating). `page`: the
	 * /categories/new page.
	 */
	let {
		initial = {},
		errors = {},
		variant = 'page',
		oncreated,
		onclose
	}: {
		initial?: Values;
		errors?: Errors;
		variant?: 'page' | 'drawer';
		/** Drawer: the category was created. */
		oncreated?: (category: CreatedCategory) => void;
		/** Drawer: Cancelar. */
		onclose?: () => void;
	} = $props();

	const drawer = $derived(variant === 'drawer');
	const kindOptions = [...KIND_OPTIONS, { value: '', label: 'Ambos' }];

	let name = $state(untrack(() => initial.name ?? ''));
	let color = $state(untrack(() => (initial.color ?? 'green') as SwatchKey));
	let icon = $state(untrack(() => toCategoryIconKey(initial.icon ?? null) ?? 'tag'));
	let kind = $state(untrack(() => initial.kind ?? ''));
	let glyphOpen = $state(false);
	let mounted = $state(false);

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
	{variant}
	{errors}
	onsubmit={() => (fieldErrors = {})}
	onfailure={(data: { errors?: Errors }) => (fieldErrors = data.errors ?? {})}
	onsaved={drawer ? created : undefined}
	{onclose}
	errorToast="No se pudo crear la categoría."
	cancelHref="/categories"
	canSave={!!name.trim()}
	bind:mounted
>
	<div class="head">
		{#if mounted}
			<button
				type="button"
				class="glyph"
				aria-label="Ícono y color"
				aria-haspopup="dialog"
				onclick={() => (glyphOpen = true)}
			>
				<IconBadge {icon} {color} size="2.75rem" />
			</button>
		{/if}
		<Field.Field class="flex-1">
			<Field.Label for="name" class="visually-hidden">Nombre</Field.Label>
			<Input
				id="name"
				name="name"
				placeholder="Ej.: Supermercado"
				autocomplete="off"
				maxlength={NAME_MAX_LENGTH}
				aria-invalid={shown.name ? 'true' : undefined}
				aria-describedby={firstError ? 'category-error' : undefined}
				class="h-11"
				bind:value={name}
			/>
		</Field.Field>
	</div>
	{#if firstError}<p class="error" id="category-error" role="alert">{firstError}</p>{/if}
	<input type="hidden" name="icon" value={icon} />
	<input type="hidden" name="color" value={color} />

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

<IconColorDrawer
	bind:open={glyphOpen}
	nested={drawer}
	icons={CATEGORY_ICONS}
	{icon}
	{color}
	onpick={(pick) => {
		icon = pick.icon;
		color = pick.color;
	}}
/>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.glyph {
		flex: none;
		display: grid;
		place-items: center;
		min-width: var(--tap-target);
		min-height: var(--tap-target);
		padding: 0;
		border: 0;
		background: transparent;
	}

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
