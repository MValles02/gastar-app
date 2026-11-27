<script lang="ts">
	import Group from '#lib/components/base/Group.svelte';
	import { resolve } from '$app/paths';
	import { openShallow } from '#lib/open-shallow.ts';
	import { enhance } from '$app/forms';
	import { refreshAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { autosave, submitAction } from '#lib/autosave.ts';
	import Glyph from '#lib/components/base/Glyph.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import OptionPicker from '#lib/components/pickers/OptionPicker.svelte';
	import Header from '#lib/components/base/Header.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { Currency } from '#lib/money.ts';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// A save sets the value at once; a reload (Deshacer) brings the stored one back in.
	let ids = $derived({ ARS: data.arsAccountId ?? '', USD: data.usdAccountId ?? '' });
	let errors = $state<Partial<Record<Currency, string>>>({});
	let uploading = $state(false);
	let fileName = $state('');

	const ERROR = { ARS: 'Elegí una cuenta en pesos.', USD: 'Elegí una cuenta en dólares.' };

	async function save(currency: Currency, next: string) {
		const previous = ids[currency];
		if (!next || next === previous) return;
		errors[currency] = undefined;
		const apply = (res: { accountId: string }) => (ids = { ...ids, [currency]: res.accountId });
		// The first pick has nothing to go back to: no Deshacer.
		if (!previous) {
			const r = await submitAction('?/account', { currency, accountId: next });
			if (r.type === 'success') {
				apply({ accountId: next });
				toast.success('Cuenta guardada.');
				await refreshAll();
			} else errors[currency] = ERROR[currency];
			return;
		}
		errors[currency] =
			(await autosave<{ accountId: string }>({
				path: '?/account',
				fields: { currency, accountId: next },
				previous: { currency, accountId: previous },
				apply
			})) ?? undefined;
	}
</script>

<svelte:head>
	<title>Banco Galicia · Gastar</title>
</svelte:head>

<Header
	title="Banco Galicia"
	back={{
		href: resolve('profile/vinculaciones'),
		label: 'Volver a Vinculaciones'
	}}
/>

<div class="page">
	<p class="lead">
		Subí el resumen de tu tarjeta Visa o Mastercard. Cada consumo entra como un movimiento de tu
		cuenta para revisar; los impuestos, en uno solo.
	</p>

	<Group aria-label="Cuentas">
		<li role="listitem">
			<form method="POST" action="?/account">
				<input type="hidden" name="currency" value="ARS" />
				<OptionPicker
					name="accountId"
					legend="Pesos"
					title="Cuenta de los consumos en pesos"
					items={data.arsAccounts}
					bind:value={() => ids.ARS, (v) => void save('ARS', v)}
					placeholder="Elegir"
					error={errors.ARS}
					errorId="ars-error"
				>
					{#snippet empty()}
						<p class="hint">
							Necesitás una cuenta en pesos. <a
								href={resolve('accounts/new')}
								onclick={(e) => openShallow(e, resolve('accounts/new'), 'newAccount')}
								>Crear cuenta</a
							>
						</p>
					{/snippet}
				</OptionPicker>
				<noscript><Button type="submit" variant="outline">Guardar</Button></noscript>
			</form>
		</li>
		<li role="listitem">
			<form method="POST" action="?/account">
				<input type="hidden" name="currency" value="USD" />
				<OptionPicker
					name="accountId"
					legend="Dólares"
					title="Cuenta de los consumos en dólares"
					items={data.usdAccounts}
					bind:value={() => ids.USD, (v) => void save('USD', v)}
					placeholder="Opcional"
					error={errors.USD}
					errorId="usd-error"
				>
					{#snippet empty()}
						<p class="hint">
							No tenés cuentas en dólares. <a
								href={resolve('accounts/new')}
								onclick={(e) => openShallow(e, resolve('accounts/new'), 'newAccount')}
								>Crear cuenta</a
							>
						</p>
					{/snippet}
				</OptionPicker>
				<noscript><Button type="submit" variant="outline">Guardar</Button></noscript>
			</form>
		</li>
	</Group>
	<p class="hint">Solo hace falta si el resumen tiene consumos en dólares.</p>

	<form
		class="upload"
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance={() => {
			uploading = true;
			return async ({ update }) => {
				await update({ reset: false });
				uploading = false;
			};
		}}
	>
		<Card.Root class="py-0">
			<label class="file" class:chosen={!!fileName}>
				<Glyph icon="file-up" tone="neutral" />
				<span class="name">{fileName || 'Elegir el PDF del resumen'}</span>
				<input
					type="file"
					name="statement"
					accept="application/pdf,.pdf"
					required
					aria-describedby={form?.upload ? 'upload-error' : undefined}
					onchange={(e) => (fileName = e.currentTarget.files?.[0]?.name ?? '')}
				/>
			</label>
		</Card.Root>
		{#if form?.upload}<p id="upload-error" class="error" role="alert">{form.upload}</p>{/if}
		<Button type="submit" class="w-full" disabled={!ids.ARS || uploading}>
			{uploading ? 'Importando…' : 'Subir resumen'}
		</Button>
		{#if !ids.ARS}<p class="hint">Elegí primero la cuenta en pesos.</p>{/if}
	</form>
	<p class="hint">
		Leemos el PDF y lo descartamos: no se guarda. Si subís el mismo resumen dos veces, no se duplica
		nada.
	</p>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-top: var(--space-1);
	}

	.lead,
	.hint,
	.error {
		margin: 0;
	}

	.lead {
		color: var(--text-muted);
	}

	.hint {
		padding-inline: var(--space-4);
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.upload {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: var(--space-2);
	}

	/* The native input covers the whole card row: tapping anywhere opens the file chooser. */
	.file {
		position: relative;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: var(--space-3) var(--space-4);
		color: var(--text-muted);
		cursor: pointer;
	}

	.file.chosen {
		color: var(--text);
	}

	.name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.file:focus-within {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
		border-radius: var(--radius-card);
	}

	.error {
		padding-inline: var(--space-4);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
