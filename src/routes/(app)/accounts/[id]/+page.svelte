<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { ACCOUNT_ICONS, toIconKey, toSwatchKey } from '$lib/appearance';
	import { autosave } from '$lib/autosave';
	import { NAME_MAX_LENGTH } from '$lib/limits';
	import { formatAmountInput } from '$lib/money';
	import { Button } from '$lib/components/ui/button/index.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DetailHero from '$lib/components/DetailHero.svelte';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import IconColorDrawer from '$lib/components/IconColorDrawer.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import InlineText from '$lib/components/InlineText.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import type { ActionData, PageData } from './$types';

	/**
	 * An account's detail and edit in one: tapping a row changes it and every change saves on its own
	 * (`?/update`) with a Deshacer toast. Archivar / Desarchivar and Eliminar (with confirm) sit below.
	 */
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// A reload (archive, Deshacer) brings the stored account back in; a save sets it at once.
	let account = $derived(data.account);
	let balance = $derived(data.balance);
	const a = $derived(account);
	const labelId = $props.id();
	const path = $derived(resolve(`/accounts/${a.id}`));

	let glyphOpen = $state(false);
	let glyphError = $state('');

	// What the update action stores, as the strings it takes.
	const values = $derived<Record<string, string>>({
		name: a.name,
		icon: toIconKey(a.icon),
		color: toSwatchKey(a.color) ?? 'green',
		initialBalance: formatAmountInput(a.initialBalance, a.currency)
	});

	async function save(fields: Record<string, string>) {
		if (Object.entries(fields).every(([k, v]) => v === values[k])) return null;
		return autosave<{ account: typeof account; balance: number }>({
			path: `${path}?/update`,
			fields,
			previous: Object.fromEntries(Object.keys(fields).map((k) => [k, values[k]])),
			apply: (res) => {
				account = res.account;
				balance = res.balance;
			}
		});
	}
</script>

<svelte:head>
	<title>{a.name} · Gastar</title>
</svelte:head>

<div class="detail">
	<PageHeader
		title={a.name}
		back={{ href: resolve('/accounts'), label: 'Volver a cuentas', text: 'Cuentas' }}
	/>

	<DetailHero cents={balance} currency={a.currency} label="Saldo" {labelId}>
		{#snippet top()}
			{#if a.archived}<StatusPill tone="neutral" label="Archivada" />{/if}
		{/snippet}
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
					{#snippet display()}{a.name}{/snippet}
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
					<IconBadge icon={toIconKey(a.icon)} color={toSwatchKey(a.color)} size="1.625rem" />
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
		<li class="row">
			<span class="k">Saldo inicial</span>
			<span class="v">
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
			</span>
		</li>
		<li class="row">
			<span class="k">Moneda</span>
			<span class="v">{a.currency === 'USD' ? 'Dólares' : 'Pesos'}</span>
		</li>
	</ul>

	{#if form?.formError}
		<p class="error" role="alert"><Icon name="alert" size="1rem" />{form.formError}</p>
	{/if}

	{#if a.archived}<p class="note">No aparece al registrar movimientos.</p>{/if}

	<div class="actions">
		<Button href={resolve(`/movements?account=${a.id}&all=1`)} variant="outline" class="w-full">
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
				title="¿Eliminar esta cuenta?"
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
	icons={ACCOUNT_ICONS}
	icon={toIconKey(a.icon)}
	color={toSwatchKey(a.color) ?? 'green'}
	onpick={async (pick) => (glyphError = (await save(pick)) ?? '')}
/>

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

	.note {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		text-align: center;
	}

	.actions {
		display: grid;
		gap: var(--space-3);
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
