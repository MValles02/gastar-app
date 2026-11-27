<script lang="ts">
	import Group from '#lib/components/base/Group.svelte';
	import Row from '#lib/components/base/Row.svelte';
	import { resolve } from '$app/paths';
	import { cardNetworkName } from '#lib/imports.ts';
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
			Leemos solo los mails de alertas de compras de Visa y de Mastercard de Galicia. Guardamos los
			datos de la compra, nunca el mail.
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
			Solo leemos los mails de alertas de compras de Visa y de Mastercard de Galicia y guardamos los
			datos de la compra, nunca el mail.
		</p>
	{/snippet}
	{#snippet disconnectNote()}
		Dejamos de leer tus mails. Lo que ya importaste queda como está. También podés revocar el acceso
		desde tu cuenta de Google.
	{/snippet}

	{#if data.cards.length > 0}
		<Group aria-label="Tarjetas">
			{#each data.cards as c (c.network + c.last4)}
				<Row
					href={resolve(`profile/gmail/cards/${c.slug}`)}
					glyph={{ icon: 'card', tone: 'neutral' }}
					title="{cardNetworkName(c.network)} ••{c.last4} · {c.type === 'debit'
						? 'Débito'
						: 'Crédito'}"
					chevron
				/>
			{/each}
		</Group>
	{/if}
</OAuthLinkPage>
