<script lang="ts">
	import { resolve } from '$app/paths';
	import { CATEGORY_ICONS, toCategoryIconKey, toSwatchKey } from '#lib/appearance.ts';
	import { autosaveChanged } from '#lib/autosave.ts';
	import { NAME_MAX_LENGTH } from '#lib/fields.ts';
	import CategoryKindRow from '#lib/components/categories/CategoryKindRow.svelte';
	import CategoryMonthHero from '#lib/components/categories/CategoryMonthHero.svelte';
	import DetailCard from '#lib/components/DetailCard.svelte';
	import DetailLifecycle from '#lib/components/DetailLifecycle.svelte';
	import DetailRow from '#lib/components/DetailRow.svelte';
	import GlyphRow from '#lib/components/GlyphRow.svelte';
	import InlineText from '#lib/components/InlineText.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { ActionData, PageData } from './$types';

	/**
	 * A category's detail and edit in one: tapping a row changes it and every change saves on its own
	 * (`?/update`) with a Deshacer toast. Archivar / Desarchivar and Eliminar (with confirm) sit below.
	 */
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// A reload (archive, Deshacer) brings the stored category back in; a save sets it at once.
	let detail = $derived({ category: data.category, disabledKinds: data.disabledKinds });
	const c = $derived(detail.category);

	// What the update action stores, as the strings it takes.
	const values = $derived<Record<string, string>>({
		name: c.name,
		icon: toCategoryIconKey(c.icon) ?? '',
		color: toSwatchKey(c.color) ?? 'green',
		kind: c.kind ?? ''
	});

	const save = (fields: Record<string, string>) =>
		autosaveChanged<typeof detail>(
			`${resolve(`categories/${c.id}`)}?/update`,
			values,
			fields,
			(res) => (detail = res)
		);
</script>

<svelte:head>
	<title>{c.name} · Gastar</title>
</svelte:head>

<div class="detail">
	<PageHeader
		title={c.name}
		back={{ href: resolve('categories'), label: 'Volver a categorías', text: 'Categorías' }}
	/>

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
		<DetailRow label="Estado">{c.archived ? 'Archivada' : 'Activa'}</DetailRow>
	</DetailCard>

	<DetailLifecycle
		can={data.actions}
		messages={{
			archive: 'Archivar',
			unarchive: 'Desarchivar',
			deleteTitle: '¿Eliminar esta categoría?',
			deleteBody: 'Esta acción no se puede deshacer.'
		}}
		formError={form?.formError}
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
