<script lang="ts">
	import { resolve } from '$app/paths';
	import { CATEGORY_ICONS, toCategoryIconKey, toSwatchKey } from '#lib/appearance.ts';
	import { autosaveChanged } from '#lib/autosave.ts';
	import { NAME_MAX_LENGTH } from '#lib/constants.ts';
	import { ARCHIVED_LABEL } from '#lib/movement.ts';
	import CategoryKindRow from '#lib/components/categories/CategoryKindRow.svelte';
	import CategoryMonthHero from '#lib/components/categories/CategoryMonthHero.svelte';
	import DetailCard from '#lib/components/DetailCard.svelte';
	import DetailLifecycle from '#lib/components/DetailLifecycle.svelte';
	import DetailRow from '#lib/components/DetailRow.svelte';
	import GlyphRow from '#lib/components/GlyphRow.svelte';
	import InlineText from '#lib/components/InlineText.svelte';
	import Status from '#lib/components/base/Status.svelte';
	import type { PageData } from './$types';

	type Detail = Pick<PageData, 'category' | 'disabledKinds'>;

	/**
	 * A category's detail and edit in one: tapping a row changes it and every change saves on its own
	 * (`?/update`) with a Deshacer toast. Archivar / Desarchivar and Eliminar (with confirm) sit below.
	 * Lives over the screen it was opened from as a drawer (shallow route) or as the full
	 * /categories/<id> page (the enclosing FormScreen).
	 */
	let {
		data,
		detail,
		formError,
		onsaved
	}: {
		data: PageData;
		detail: Detail;
		formError?: string | null;
		/** A save's (or undo's) stored category. */
		onsaved: (next: Detail) => void;
	} = $props();

	const c = $derived(detail.category);
	const path = $derived(resolve(`categories/${c.id}`));

	// What the update action stores, as the strings it takes.
	const values = $derived<Record<string, string>>({
		name: c.name,
		icon: toCategoryIconKey(c.icon) ?? '',
		color: toSwatchKey(c.color) ?? 'green',
		kind: c.kind ?? ''
	});

	const save = (fields: Record<string, string>) =>
		autosaveChanged<Detail>(`${path}?/update`, values, fields, onsaved);
</script>

<div class="detail">
	<CategoryMonthHero label={data.month.label} nets={data.nets} />

	<DetailCard>
		<DetailRow label="Nombre">
			<InlineText
				label="Nombre"
				value={values.name}
				maxlength={NAME_MAX_LENGTH}
				required
				onsave={(name) => save({ name })}
			>
				{#snippet display()}{c.name}{/snippet}
			</InlineText>
		</DetailRow>
		<GlyphRow
			icons={CATEGORY_ICONS}
			icon={toCategoryIconKey(c.icon) ?? 'tag'}
			badge={toCategoryIconKey(c.icon) ?? 'categories'}
			color={toSwatchKey(c.color)}
			{save}
		/>
		<CategoryKindRow
			kind={values.kind}
			disabled={detail.disabledKinds}
			save={(kind) => save({ kind })}
		/>
		<DetailRow label="Estado"
			><Status
				tone={c.archived ? 'neutral' : 'ok'}
				label={c.archived ? ARCHIVED_LABEL : 'Activa'}
			/></DetailRow
		>
	</DetailCard>

	<DetailLifecycle
		{path}
		sheet="category"
		can={data.actions}
		messages={{
			archive: 'Archivar',
			archiveTitle: '¿Archivar esta categoría?',
			archiveBody: 'Deja de aparecer al registrar movimientos. Podés desarchivarla cuando quieras.',
			unarchive: 'Desarchivar',
			deleteTitle: '¿Eliminar esta categoría?',
			deleteBody: 'Esta acción no se puede deshacer.'
		}}
		{formError}
		movementsHref={resolve(`movements?category=${c.id}&all=1`)}
	/>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}
</style>
