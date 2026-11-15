<script lang="ts">
	import { resolve } from '$app/paths';
	import { ACCOUNT_ICONS, toIconKey, toSwatchKey } from '#lib/appearance.ts';
	import { autosaveChanged } from '#lib/autosave.ts';
	import { NAME_MAX_LENGTH } from '#lib/fields.ts';
	import { formatAmountInput } from '#lib/money.ts';
	import DetailCard from '#lib/components/DetailCard.svelte';
	import DetailHero from '#lib/components/DetailHero.svelte';
	import DetailLifecycle from '#lib/components/DetailLifecycle.svelte';
	import DetailRow from '#lib/components/DetailRow.svelte';
	import GlyphRow from '#lib/components/GlyphRow.svelte';
	import InlineText from '#lib/components/InlineText.svelte';
	import Money from '#lib/components/Money.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import type { ActionData, PageData } from './$types';

	/**
	 * An account's detail and edit in one: tapping a row changes it and every change saves on its own
	 * (`?/update`) with a Deshacer toast. Archivar / Desarchivar and Eliminar (with confirm) sit below.
	 */
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// A reload (archive, Deshacer) brings the stored account back in; a save sets it at once.
	let detail = $derived({ account: data.account, balance: data.balance });
	const a = $derived(detail.account);
	const labelId = $props.id();

	// What the update action stores, as the strings it takes.
	const values = $derived<Record<string, string>>({
		name: a.name,
		icon: toIconKey(a.icon),
		color: toSwatchKey(a.color) ?? 'green',
		initialBalance: formatAmountInput(a.initialBalance, a.currency)
	});

	const save = (fields: Record<string, string>) =>
		autosaveChanged<typeof detail>(
			`${resolve(`accounts/${a.id}`)}?/update`,
			values,
			fields,
			(res) => (detail = res)
		);
</script>

<svelte:head>
	<title>{a.name} · Gastar</title>
</svelte:head>

<div class="detail">
	<PageHeader
		title={a.name}
		back={{ href: resolve('accounts'), label: 'Volver a cuentas', text: 'Cuentas' }}
	/>

	<DetailHero cents={detail.balance} currency={a.currency} label="Saldo" {labelId}>
		{#snippet top()}
			{#if a.archived}<StatusPill tone="neutral" label="Archivada" />{/if}
		{/snippet}
	</DetailHero>

	<DetailCard>
		<DetailRow label="Nombre">
			<InlineText
				label="Nombre"
				value={values.name}
				maxlength={NAME_MAX_LENGTH}
				required
				onsave={(name) => save({ name })}
			>
				{#snippet display()}{a.name}{/snippet}
			</InlineText>
		</DetailRow>
		<GlyphRow
			icons={ACCOUNT_ICONS}
			icon={toIconKey(a.icon)}
			badge={toIconKey(a.icon)}
			color={toSwatchKey(a.color)}
			{save}
		/>
		<DetailRow label="Saldo inicial">
			<InlineText
				label="Saldo inicial"
				inputmode="decimal"
				value={values.initialBalance}
				onsave={(initialBalance) => save({ initialBalance })}
			>
				{#snippet display()}
					<Money cents={a.initialBalance} currency={a.currency} tone="stock" />
				{/snippet}
			</InlineText>
		</DetailRow>
		<DetailRow label="Moneda">{a.currency === 'USD' ? 'Dólares' : 'Pesos'}</DetailRow>
	</DetailCard>

	<DetailLifecycle
		can={data.actions}
		messages={{
			archive: 'Archivar',
			unarchive: 'Desarchivar',
			deleteTitle: '¿Eliminar esta cuenta?',
			deleteBody: 'Esta acción no se puede deshacer.'
		}}
		formError={form?.formError}
		note={a.archived ? 'No aparece al registrar movimientos.' : null}
		movementsHref={resolve(`movements?account=${a.id}&all=1`)}
	/>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}
</style>
