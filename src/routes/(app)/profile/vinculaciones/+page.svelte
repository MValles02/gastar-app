<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import DatePicker from '#lib/components/pickers/DatePicker.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { autosave } from '#lib/autosave.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// A save sets the value at once; a reload (Deshacer) brings the stored one back in.
	let importFrom = $derived(data.importFrom ?? '');
	let errors = $state<{ from?: string }>({});

	const linkStatus = (state: string | null | undefined) =>
		state === 'linked'
			? ({ tone: 'ok', label: 'Vinculado' } as const)
			: state === 'reconnect'
				? ({ tone: 'bad', label: 'Reconectar' } as const)
				: undefined;

	async function saveFrom(next: string) {
		if (!next || next === importFrom) return;
		errors.from =
			(await autosave<{ from: string }>({
				path: '?/importFrom',
				fields: { from: next },
				previous: { from: importFrom },
				apply: (res) => (importFrom = res.from)
			})) ?? undefined;
	}
</script>

<svelte:head>
	<title>Vinculaciones · Gastar</title>
</svelte:head>

<PageHeader
	title="Vinculaciones"
	back={{ href: resolve('profile'), label: 'Volver a Perfil', text: 'Perfil' }}
/>

<div class="page">
	<!-- A link that works shows its status as a pill; one still to set up shows the step instead. -->
	{#snippet vincular()}<span class="val">Vincular</span>{/snippet}
	{#snippet configurar()}<span class="val">Configurar</span>{/snippet}

	<ListCard aria-label="Vinculaciones">
		{#if data.mp}
			<ListRow
				href={resolve('profile/mercado-pago')}
				glyph={{ icon: 'phone', tone: 'neutral' }}
				title="Mercado Pago"
				status={linkStatus(data.mp)}
				value={linkStatus(data.mp) ? undefined : vincular}
				chevron
			/>
		{/if}
		{#if data.gmail !== undefined}
			<ListRow
				href={resolve('profile/gmail')}
				glyph={{ icon: 'mail', tone: 'neutral' }}
				title="Gmail"
				status={linkStatus(data.gmail)}
				value={linkStatus(data.gmail) ? undefined : vincular}
				chevron
			/>
		{/if}
		<ListRow
			href={resolve('profile/galicia')}
			glyph={{ icon: 'card', tone: 'neutral' }}
			title="Banco Galicia"
			status={data.galiciaReady ? { tone: 'ok', label: 'Configurado' } : undefined}
			value={data.galiciaReady ? undefined : configurar}
			chevron
		/>
	</ListCard>

	<p class="hint">
		Traé tus movimientos sin tipearlos. Lo que reconocemos se aprueba solo; el resto lo revisás vos.
	</p>

	{#if data.importFrom}
		<ListCard aria-label="Importación">
			<div role="listitem">
				<form method="POST" action="?/importFrom" novalidate>
					<fieldset disabled={data.running}>
						<DatePicker
							name="from"
							label="Importar desde"
							bind:value={() => importFrom, (v) => void saveFrom(v)}
							min={data.earliest}
							max={data.today}
							error={errors.from}
							errorId="from-error"
						/>
					</fieldset>
					<noscript><Button type="submit" variant="outline">Guardar fecha</Button></noscript>
				</form>
			</div>
		</ListCard>
		{#if data.running}
			<p class="hint">Hay una sincronización en curso. Podés cambiar la fecha cuando termine.</p>
		{:else}
			<p class="hint">
				Vale para Mercado Pago y las alertas de Gmail: no se importa nada anterior. Hasta 12 meses
				para atrás. Los resúmenes del Banco Galicia se importan completos.
			</p>
		{/if}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.val {
		min-width: 0;
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-muted);
		font-weight: 400;
	}

	fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}

	.hint {
		padding-inline: var(--space-4);
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}
</style>
