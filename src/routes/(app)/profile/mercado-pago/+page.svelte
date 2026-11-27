<script lang="ts">
	import Group from '#lib/components/base/Group.svelte';
	import { resolve } from '$app/paths';
	import { openShallow } from '#lib/open-shallow.ts';
	import { autosave, submitAction } from '#lib/autosave.ts';
	import OptionPicker from '#lib/components/pickers/OptionPicker.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { refreshAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import OAuthLinkPage from '../OAuthLinkPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// A save sets the value at once; a reload (Deshacer) brings the stored one back in.
	let accountId = $derived(data.connection?.accountId ?? '');
	let errors = $state<{ accountId?: string }>({});

	async function saveAccount(next: string) {
		if (!next || next === accountId) return;
		errors.accountId = undefined;
		// The first pick has nothing to go back to: no Deshacer.
		if (!accountId) {
			const r = await submitAction('?/account', { accountId: next });
			if (r.type === 'success') {
				accountId = next;
				toast.success('Cuenta guardada.');
				await refreshAll();
			} else errors.accountId = 'Elegí una cuenta en pesos.';
			return;
		}
		errors.accountId =
			(await autosave<{ accountId: string }>({
				path: '?/account',
				fields: { accountId: next },
				previous: { accountId },
				apply: (res) => (accountId = res.accountId)
			})) ?? undefined;
	}
</script>

<OAuthLinkPage name="Mercado Pago" {data} introTitle="Traé tus pagos sin tipearlos">
	{#snippet intro()}
		<p>
			Importamos pagos, cobros y rendimientos. Lo que reconocemos se aprueba solo; el resto lo
			revisás vos.
		</p>
	{/snippet}
	{#snippet reconnect()}
		<p>Mercado Pago ya no acepta el acceso guardado. Reconectá para seguir importando tus pagos.</p>
	{/snippet}
	{#snippet linked()}
		<p class="lead">Tu cuenta de Mercado Pago está vinculada.</p>

		<Group aria-label="Ajustes">
			<li role="listitem">
				<form method="POST" action="?/account">
					<OptionPicker
						name="accountId"
						legend="Entra en"
						title="Cuenta que recibe los movimientos"
						items={data.accounts}
						bind:value={() => accountId, (v) => void saveAccount(v)}
						placeholder="Elegir"
						error={errors.accountId}
						errorId="account-error"
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
		</Group>
		{#if data.connection?.accountId}
			<p class="hint">
				La fecha desde la que se importa está en <a href={resolve('profile/vinculaciones')}
					>Vinculaciones</a
				>.
			</p>
		{/if}
	{/snippet}
	{#snippet disconnectNote()}
		Dejamos de importar tus pagos. Lo que ya importaste queda como está. También podés revocar el
		acceso desde tu cuenta de Mercado Pago.
	{/snippet}
</OAuthLinkPage>

<style>
	.lead,
	.hint {
		margin: 0;
		color: var(--text-muted);
	}

	.hint {
		padding-inline: var(--space-4);
		font-size: var(--font-size-sm);
	}
</style>
