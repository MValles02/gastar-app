<script lang="ts">
	import { resolve } from '$app/paths';
	import { ACCOUNT_ICONS, toIconKey, toSwatchKey } from '#lib/appearance.ts';
	import { autosaveChanged } from '#lib/autosave.ts';
	import { NAME_MAX_LENGTH } from '#lib/constants.ts';
	import { CURRENCY_LABEL, formatAmountInput } from '#lib/money.ts';
	import { ARCHIVED_LABEL } from '#lib/movement.ts';
	import DetailCard from '#lib/components/DetailCard.svelte';
	import DetailHero from '#lib/components/DetailHero.svelte';
	import DetailLifecycle from '#lib/components/DetailLifecycle.svelte';
	import DetailRow from '#lib/components/DetailRow.svelte';
	import GlyphRow from '#lib/components/GlyphRow.svelte';
	import InlineText from '#lib/components/InlineText.svelte';
	import Money from '#lib/components/Money.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import type { PageData } from './$types';

	type Detail = Pick<PageData, 'account' | 'balance'>;

	/**
	 * An account's detail and edit in one: tapping a row changes it and every change saves on its own
	 * (`?/update`) with a Deshacer toast. Archivar / Desarchivar and Eliminar (with confirm) sit below.
	 * Lives over the accounts list as a drawer (shallow route) or as the full /accounts/<id> page (the
	 * enclosing FormScreen).
	 */
	let {
		detail,
		actions,
		formError,
		onsaved
	}: {
		detail: Detail;
		actions: PageData['actions'];
		formError?: string | null;
		/** A save's (or undo's) stored account. */
		onsaved: (next: Detail) => void;
	} = $props();

	const a = $derived(detail.account);
	const path = $derived(resolve(`accounts/${a.id}`));

	// What the update action stores, as the strings it takes.
	const values = $derived<Record<string, string>>({
		name: a.name,
		icon: toIconKey(a.icon),
		color: toSwatchKey(a.color) ?? 'green',
		initialBalance: formatAmountInput(a.initialBalance, a.currency)
	});

	const save = (fields: Record<string, string>) =>
		autosaveChanged<Detail>(`${path}?/update`, values, fields, onsaved);
</script>

<div class="detail">
	<DetailHero cents={detail.balance} currency={a.currency} label="Saldo">
		{#snippet top()}
			{#if a.archived}<StatusPill tone="neutral" label={ARCHIVED_LABEL} />{/if}
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
		<DetailRow label="Moneda">{CURRENCY_LABEL[a.currency]}</DetailRow>
	</DetailCard>

	<DetailLifecycle
		{path}
		sheet="account"
		can={actions}
		messages={{
			archive: 'Archivar',
			archiveTitle: '¿Archivar esta cuenta?',
			archiveBody: 'Deja de aparecer al registrar movimientos. Podés desarchivarla cuando quieras.',
			unarchive: 'Desarchivar',
			deleteTitle: '¿Eliminar esta cuenta?',
			deleteBody: 'Esta acción no se puede deshacer.'
		}}
		{formError}
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
