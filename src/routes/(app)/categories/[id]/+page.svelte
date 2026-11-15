<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { CATEGORY_ICONS, toCategoryIconKey, toSwatchKey } from '$lib/appearance';
	import { autosave } from '$lib/autosave';
	import { NAME_MAX_LENGTH } from '$lib/fields';
	import { KIND_OPTIONS } from '$lib/movement';
	import type { Currency } from '$lib/money';
	import { Button } from '$lib/components/ui/button/index.js';
	import BottomDrawer from '$lib/components/BottomDrawer.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DetailHero from '$lib/components/DetailHero.svelte';
	import HeroAmount from '$lib/components/HeroAmount.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import IconColorDrawer from '$lib/components/IconColorDrawer.svelte';
	import InlineText from '$lib/components/InlineText.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Money from '$lib/components/Money.svelte';
	import type { ActionData, PageData } from './$types';

	/**
	 * A category's detail and edit in one: tapping a row changes it and every change saves on its own
	 * (`?/update`) with a Deshacer toast. Archivar / Desarchivar and Eliminar (with confirm) sit below.
	 */
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// A reload (archive, Deshacer) brings the stored category back in; a save sets it at once.
	let detail = $derived({ category: data.category, disabledKinds: data.disabledKinds });
	const c = $derived(detail.category);
	const path = $derived(resolve(`/categories/${c.id}`));
	const single = $derived(data.nets.length === 1 ? data.nets[0] : null);

	let glyphOpen = $state(false);
	let kindOpen = $state(false);
	let glyphError = $state('');
	let kindError = $state('');

	const KIND_HINT: Record<string, string> = {
		outcome: 'Solo aparece al registrar gastos.',
		income: 'Solo aparece al registrar ingresos.',
		'': 'Aparece al registrar gastos e ingresos.'
	};
	const KINDS = [...KIND_OPTIONS, { value: '', label: 'Ambos' }].map((k) => ({
		...k,
		hint: KIND_HINT[k.value]
	}));
	const kindLabel = $derived(KINDS.find((k) => k.value === (c.kind ?? ''))?.label);

	// What the update action stores, as the strings it takes.
	const values = $derived<Record<string, string>>({
		name: c.name,
		icon: toCategoryIconKey(c.icon) ?? '',
		color: toSwatchKey(c.color) ?? 'green',
		kind: c.kind ?? ''
	});

	async function save(fields: Record<string, string>) {
		if (Object.entries(fields).every(([k, v]) => v === values[k])) return null;
		return autosave<typeof detail>({
			path: `${path}?/update`,
			fields,
			previous: Object.fromEntries(Object.keys(fields).map((k) => [k, values[k]])),
			apply: (res) => (detail = res)
		});
	}
</script>

<!-- Net spend (outcomes - incomes) as a cash flow: spend in red, net income in green. -->
{#snippet flow(net: number, currency: Currency)}
	<Money cents={-net} {currency} tone="flow" />
{/snippet}

<svelte:head>
	<title>{c.name} · Gastar</title>
</svelte:head>

<div class="detail">
	<PageHeader
		title={c.name}
		back={{ href: resolve('/categories'), label: 'Volver a categorías', text: 'Categorías' }}
	/>

	<DetailHero ariaLabel="Resumen del mes" label={data.month.label}>
		{#if single}
			<HeroAmount cents={-single.net} currency={single.currency} tone="flow" />
		{:else if data.nets.length === 0}
			<p class="muted">Sin movimientos en este mes.</p>
		{:else}
			<dl class="duo">
				{#each data.nets as n (n.currency)}
					<div>
						<dt>{n.currency}</dt>
						<dd class="amount">{@render flow(n.net, n.currency)}</dd>
					</div>
				{/each}
			</dl>
		{/if}
	</DetailHero>

	<ul class="card">
		<li class="row">
			<span class="k">Nombre</span>
			<span class="v">
				<InlineText
					label="Nombre"
					value={values.name}
					maxlength={NAME_MAX_LENGTH}
					required
					onsave={(name) => save({ name })}
				>
					{#snippet display()}{c.name}{/snippet}
				</InlineText>
			</span>
		</li>
		<li>
			<button
				type="button"
				class="row pick"
				aria-haspopup="dialog"
				onclick={() => (glyphOpen = true)}
			>
				<span class="k">Ícono y color</span>
				<span class="v glyph">
					<IconBadge
						icon={toCategoryIconKey(c.icon) ?? 'categories'}
						color={toSwatchKey(c.color)}
						size="1.625rem"
					/>
					<ChevronRight
						size={16}
						strokeWidth={1.75}
						aria-hidden="true"
						class="text-muted-foreground"
					/>
				</span>
			</button>
			{#if glyphError}<p class="error" role="alert">{glyphError}</p>{/if}
		</li>
		<li>
			<button
				type="button"
				class="row pick"
				aria-haspopup="dialog"
				onclick={() => (kindOpen = true)}
			>
				<span class="k">Se usa para</span>
				<span class="v glyph">
					{kindLabel}
					<ChevronRight
						size={16}
						strokeWidth={1.75}
						aria-hidden="true"
						class="text-muted-foreground"
					/>
				</span>
			</button>
			{#if kindError}<p class="error" role="alert">{kindError}</p>{/if}
		</li>
		<li class="row">
			<span class="k">Estado</span>
			<span class="v">{c.archived ? 'Archivada' : 'Activa'}</span>
		</li>
	</ul>

	{#if form?.formError}
		<p class="error" role="alert"><Icon name="alert" size="1rem" />{form.formError}</p>
	{/if}

	<div class="actions">
		<Button href={resolve(`/movements?category=${c.id}&all=1`)} variant="outline" class="w-full">
			Ver movimientos
		</Button>
		{#if data.actions.canArchive}
			<form method="POST" action="?/archive" use:enhance>
				<Button type="submit" variant="outline" class="w-full">Archivar</Button>
			</form>
		{/if}
		{#if data.actions.canUnarchive}
			<form method="POST" action="?/unarchive" use:enhance>
				<Button type="submit" class="w-full">Desarchivar</Button>
			</form>
		{/if}
		{#if data.actions.canDelete}
			<ConfirmDialog
				triggerLabel="Eliminar"
				triggerVariant="destructive"
				triggerClass="w-full"
				title="¿Eliminar esta categoría?"
				confirmLabel="Eliminar"
				action="?/delete"
			>
				Esta acción no se puede deshacer.
			</ConfirmDialog>
		{/if}
	</div>
</div>

<IconColorDrawer
	bind:open={glyphOpen}
	nested={false}
	icons={CATEGORY_ICONS}
	icon={toCategoryIconKey(c.icon) ?? 'tag'}
	color={toSwatchKey(c.color) ?? 'green'}
	onpick={async (pick) => (glyphError = (await save(pick)) ?? '')}
/>

<BottomDrawer title="Se usa para" bind:open={kindOpen}>
	<ul class="kinds">
		{#each KINDS as k (k.value)}
			{@const blocked = detail.disabledKinds.some((d) => d === k.value)}
			<li>
				<button
					type="button"
					class="kind"
					aria-pressed={k.value === (c.kind ?? '')}
					disabled={blocked}
					onclick={async () => {
						kindOpen = false;
						kindError = (await save({ kind: k.value })) ?? '';
					}}
				>
					<span class="text">
						<span class="title">{k.label}</span>
						<span class="hint">{k.hint}</span>
					</span>
					{#if k.value === (c.kind ?? '')}<Check
							size={20}
							strokeWidth={1.75}
							aria-hidden="true"
						/>{/if}
				</button>
			</li>
		{/each}
	</ul>
</BottomDrawer>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-base);
	}

	.pick {
		width: 100%;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.v {
		min-width: 0;
		text-align: right;
		font-weight: 500;
	}

	.glyph {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	.duo {
		align-self: stretch;
		margin: 0;
	}

	.duo div {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.duo dd {
		font-family: var(--font-display);
		font-size: var(--font-size-xl);
		font-weight: 500;
	}

	.muted {
		color: var(--text-muted);
	}

	.amount {
		white-space: nowrap;
	}

	.actions {
		display: grid;
		gap: var(--space-3);
	}

	.kinds {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.kind {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		width: 100%;
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-4);
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.kind:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.text {
		display: flex;
		flex-direction: column;
	}

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		padding: 0 var(--space-4) var(--space-3);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
