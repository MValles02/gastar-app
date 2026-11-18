<script lang="ts">
	import { resolve } from '$app/paths';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import OAuthLinkPage from '../OAuthLinkPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<OAuthLinkPage
	name="Gmail"
	{data}
	introTitle="Traé tus compras con tarjeta sin tipearlas"
	linkedTitle="Vinculado"
>
	{#snippet intro()}
		<p>
			Leemos solo los mails de alertas de compras de Visa. Guardamos los datos de la compra, nunca
			el mail.
		</p>
		<p>
			Google va a mostrar “Google no verificó esta app”. Para seguir tocá “Configuración avanzada” y
			después “Ir a Gastar (no seguro)”.
		</p>
	{/snippet}
	{#snippet reconnect()}
		<p>
			Google ya no acepta el acceso guardado para {data.connection?.email}. Reconectá para seguir
			leyendo tus alertas de compras.
		</p>
	{/snippet}
	{#snippet linked()}
		<p class="email">{data.connection?.email}</p>
		<p>
			Solo leemos los mails de alertas de compras de Visa y guardamos los datos de la compra, nunca
			el mail.
		</p>
	{/snippet}
	{#snippet disconnectNote()}
		Dejamos de leer tus mails. Lo que ya importaste queda como está. También podés revocar el acceso
		desde tu cuenta de Google.
	{/snippet}

	{#if data.cards.length > 0}
		<ListCard aria-label="Tarjetas">
			{#each data.cards as c (c.network + c.last4)}
				<ListRow
					href={resolve(`profile/gmail/cards/${c.slug}`)}
					lead={{ icon: 'card', color: null }}
					title="Visa ••{c.last4} · {c.type === 'debit' ? 'Débito' : 'Crédito'}"
					chevron
				/>
			{/each}
		</ListCard>
	{/if}
</OAuthLinkPage>
