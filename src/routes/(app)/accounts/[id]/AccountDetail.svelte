<script lang="ts">
	import { resolve } from '$app/paths';
	import { ACCOUNT_ICONS, toIconKey, toneOf, toSwatchKey } from '#lib/appearance.ts';
	import { autosaveChanged } from '#lib/autosave.ts';
	import { NAME_MAX_LENGTH } from '#lib/constants.ts';
	import { CURRENCY_LABEL, formatAmountInput } from '#lib/money.ts';
	import { ARCHIVED_LABEL } from '#lib/movement.ts';
	import Tile from '#lib/components/base/Tile.svelte';
	import DetailLifecycle from '#lib/components/DetailLifecycle.svelte';
	import IconColorDrawer from '#lib/components/IconColorDrawer.svelte';
	import InlineText from '#lib/components/InlineText.svelte';
	import Amount from '#lib/components/base/Amount.svelte';
	import Glyph from '#lib/components/base/Glyph.svelte';
	import Group from '#lib/components/base/Group.svelte';
	import Row from '#lib/components/base/Row.svelte';
	import { es } from '#lib/copy/es.ts';
	import Status from '#lib/components/base/Status.svelte';
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
	let iconOpen = $state(false);
	let iconError = $state('');
</script>

<div class="detail">
	<Tile align="center" caption="Saldo">
		{#snippet top()}
			{#if a.archived}<Status tone="neutral" label={ARCHIVED_LABEL} />{/if}
		{/snippet}
		<Amount size="hero" as="p" cents={detail.balance} currency={a.currency} />
	</Tile>

	<Group>
		<Row title="Nombre">
			{#snippet trailing()}
				<InlineText
					label="Nombre"
					value={values.name}
					maxlength={NAME_MAX_LENGTH}
					required
					onsave={(name) => save({ name })}
				>
					{#snippet display()}{a.name}{/snippet}
				</InlineText>
			{/snippet}
		</Row>
		<Row
			title={es.ui.iconColor.title}
			onclick={() => (iconOpen = true)}
			haspopup
			chevron
			error={iconError}
		>
			{#snippet trailing()}<Glyph
					icon={toIconKey(a.icon)}
					tone={toneOf(a.color)}
					size="chip"
				/>{/snippet}
		</Row>
		<Row title="Saldo inicial">
			{#snippet trailing()}
				<InlineText
					label="Saldo inicial"
					inputmode="decimal"
					value={values.initialBalance}
					onsave={(initialBalance) => save({ initialBalance })}
				>
					{#snippet display()}
						<Amount cents={a.initialBalance} currency={a.currency} />
					{/snippet}
				</InlineText>
			{/snippet}
		</Row>
		<Row title="Moneda">{#snippet trailing()}{CURRENCY_LABEL[a.currency]}{/snippet}</Row>
	</Group>

	<IconColorDrawer
		bind:open={iconOpen}
		icons={ACCOUNT_ICONS}
		icon={toIconKey(a.icon)}
		color={toSwatchKey(a.color) ?? 'green'}
		onpick={async (pick) => (iconError = (await save(pick)) ?? '')}
	/>

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
