<script lang="ts">
	import { resolve } from '$app/paths';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Gmail · Gastar</title>
</svelte:head>

<PageHeader
	title="Gmail"
	back={{
		href: resolve('profile/vinculaciones'),
		label: 'Volver a Vinculaciones',
		text: 'Vinculaciones'
	}}
/>

<div class="page">
	{#if data.flash}<p class="flash bad" role="alert">{data.flash}</p>{/if}
	{#if data.linked}<p class="flash" role="status">Gmail vinculado.</p>{/if}

	{#if !data.connection}
		<section class="card" aria-labelledby="intro">
			<h2 id="intro">Traé tus compras con tarjeta sin tipearlas</h2>
			<p>
				Leemos solo los mails de alertas de compras de Visa. Guardamos los datos de la compra, nunca
				el mail.
			</p>
			<p>
				Google va a mostrar “Google no verificó esta app”. Para seguir tocá “Configuración avanzada”
				y después “Ir a Gastar (no seguro)”.
			</p>
			<form method="POST" action="?/connect">
				<Button type="submit" class="w-full">Vincular Gmail</Button>
			</form>
		</section>
	{:else if data.connection.needsReconnect}
		<section class="card" aria-labelledby="intro">
			<h2 id="intro">Hay que volver a vincular</h2>
			<p>
				Google ya no acepta el acceso guardado para {data.connection.email}. Reconectá para seguir
				leyendo tus alertas de compras.
			</p>
			<form method="POST" action="?/connect">
				<Button type="submit" class="w-full">Reconectar</Button>
			</form>
		</section>
	{:else}
		<section class="card" aria-labelledby="intro">
			<h2 id="intro">Vinculado</h2>
			<p class="email">{data.connection.email}</p>
			<p>
				Solo leemos los mails de alertas de compras de Visa y guardamos los datos de la compra,
				nunca el mail.
			</p>
		</section>
	{/if}

	{#if data.cards.length > 0}
		<ListCard aria-label="Tarjetas">
			{#each data.cards as c (c.network + c.last4)}
				<ListRow
					href={resolve(`profile/gmail/cards/${c.network}-${c.last4}`)}
					lead={{ icon: 'card', color: null }}
					title="Visa ••{c.last4} · {c.type === 'debit' ? 'Débito' : 'Crédito'}"
					chevron
				/>
			{/each}
		</ListCard>
	{/if}

	{#if data.connection}
		<ConfirmDialog
			triggerLabel="Desvincular"
			triggerClass="w-full"
			title="¿Desvincular Gmail?"
			confirmLabel="Desvincular"
			action="?/disconnect"
		>
			Dejamos de leer tus mails. Lo que ya importaste queda como está. También podés revocar el
			acceso desde tu cuenta de Google.
		</ConfirmDialog>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-5) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.card h2 {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	.card p {
		margin: 0;
		color: var(--text-muted);
	}

	.card p.email {
		overflow-wrap: anywhere;
		color: var(--text);
		font-weight: 500;
	}

	.card form {
		padding-top: var(--space-2);
	}

	.flash {
		margin: 0;
		padding: var(--space-3) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.flash.bad {
		color: var(--negative);
	}
</style>
