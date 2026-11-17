<script lang="ts">
	import { resolve } from '$app/paths';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import OptionPicker from '#lib/components/pickers/OptionPicker.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const initial = $derived(form?.values ?? data.initial);
	// svelte-ignore state_referenced_locally
	let type = $state(initial.type);
	// svelte-ignore state_referenced_locally
	let arsId = $state(initial.arsAccountId);
	// svelte-ignore state_referenced_locally
	let usdId = $state(initial.usdAccountId);
	const errors = $derived(form?.errors ?? {});
</script>

<svelte:head>
	<title>Tarjeta Visa ••{data.last4} · Gastar</title>
</svelte:head>

<PageHeader
	title="Visa ••{data.last4}"
	back={{ href: resolve('profile/gmail'), label: 'Volver a Gmail', text: 'Gmail' }}
/>

<div class="page">
	<p class="lead">
		Con una tarjeta de débito, cada compra de la alerta entra como un movimiento de tu cuenta para
		revisar. Con una de crédito, las compras entran en las cuentas de Banco Galicia, las mismas que
		usa el resumen, y el resumen las confirma sin duplicarlas.
	</p>

	<FormShell action="?/save" {errors} cancelHref="profile/gmail" submitLabel="Guardar">
		<div class="field">
			<span id="type-label" class="label">Tipo de tarjeta</span>
			<SegmentedControl
				name="type"
				options={[
					{ value: 'credit', label: 'Crédito' },
					{ value: 'debit', label: 'Débito' }
				]}
				bind:value={type}
				labelledby="type-label"
			/>
			{#if errors.type}<p class="error" role="alert">{errors.type}</p>{/if}
		</div>

		<ListCard aria-label="Cuentas">
			<div role="listitem">
				<OptionPicker
					name="arsAccountId"
					legend="Cuenta en pesos"
					title="Cuenta de las compras en pesos"
					items={data.arsAccounts}
					bind:value={arsId}
					placeholder="Elegir"
					error={errors.arsAccountId}
					errorId="ars-error"
				>
					{#snippet empty()}
						<p class="hint">
							Necesitás una cuenta en pesos. <a href={resolve('accounts/new')}>Crear cuenta</a>
						</p>
					{/snippet}
				</OptionPicker>
			</div>
			<div role="listitem">
				<OptionPicker
					name="usdAccountId"
					legend="Cuenta en dólares"
					title="Cuenta de las compras en dólares"
					items={data.usdAccounts}
					bind:value={usdId}
					placeholder="Opcional"
					error={errors.usdAccountId}
					errorId="usd-error"
				>
					{#snippet empty()}
						<p class="hint">
							No tenés cuentas en dólares. <a href={resolve('accounts/new')}>Crear cuenta</a>
						</p>
					{/snippet}
				</OptionPicker>
			</div>
		</ListCard>
		<p class="hint">La cuenta en dólares solo hace falta si comprás en dólares.</p>
	</FormShell>
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

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.label {
		padding-inline: var(--space-4);
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.hint {
		padding-inline: var(--space-4);
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.error {
		padding-inline: var(--space-4);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
