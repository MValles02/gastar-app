<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ERROR_LABELS: Record<string, string> = {
		auth: 'token inválido o vencido',
		report_timeout: 'Mercado Pago tardó demasiado en generar el reporte',
		network: 'sin conexión con Mercado Pago',
		parse: 'reporte con formato inesperado',
		config: 'revisá la cuenta configurada'
	};

	const errorLabel = (code: string) =>
		ERROR_LABELS[code] ?? `error ${code.replace(/^mp_/, '')} de Mercado Pago`;

	const status = $derived(
		data.running
			? 'Sincronizando…'
			: data.lastError
				? `No se pudo sincronizar (${errorLabel(data.lastError)})`
				: data.lastRun
					? `Última sincronización: ${data.lastRun}`
					: 'Todavía no se sincronizó.'
	);
</script>

<svelte:head>
	<title>Mercado Pago · Gastar</title>
</svelte:head>

<PageHeader title="Mercado Pago" back={{ href: resolve('/profile'), label: 'Volver a Perfil' }} />

<div class="page">
	{#if !data.configured}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon"><Icon name="phone" size="1rem" /></Empty.Media>
				<Empty.Description>La importación de Mercado Pago no está configurada.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<div class="sync">
			<p class="status" role="status">{status}</p>
			<form method="POST" action="?/sync" use:enhance>
				<Button type="submit" variant="outline" disabled={data.running}>Sincronizar ahora</Button>
			</form>
		</div>

		{#if data.groups.length === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Icon name="movements" size="1rem" /></Empty.Media>
					<Empty.Description>No hay movimientos para revisar.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else}
			<div class="groups">
				{#each data.groups as g (g.day)}
					<section aria-labelledby="day-{g.day}">
						<h2 id="day-{g.day}">{g.heading}</h2>
						<ListCard>
							{#each g.items as item (item.id)}
								{#snippet value()}
									<Money
										cents={item.amount}
										currency="ARS"
										tone="flow"
										direction={item.isCredit ? 'income' : 'outcome'}
									/>
								{/snippet}
								<ListRow
									lead={{ letter: item.title.charAt(0).toUpperCase(), color: null }}
									title={item.title}
									{value}
								/>
							{/each}
						</ListCard>
					</section>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.sync {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.status {
		min-width: 0;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	h2 {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-muted);
		padding-inline: var(--space-4);
		margin-bottom: var(--space-2);
	}
</style>
