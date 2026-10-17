<script lang="ts">
	import { CURRENCY_NAME } from '$lib/money';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormActions from '$lib/components/FormActions.svelte';
	import CardEyebrow from '$lib/components/CardEyebrow.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ActionLink from '$lib/components/ActionLink.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import SummaryCard from '$lib/components/SummaryCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SwitchRow from '$lib/components/SwitchRow.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import { WIZARD_STEPS } from '$lib/plan-wizard';
	import LimitList from '../LimitList.svelte';
	import RecurringRow from '../RecurringRow.svelte';
	import SavingsFields from '../SavingsFields.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const titles = [
		'¿Cuánto cobrás por mes?',
		'¿Qué pagos fijos tenés?',
		'¿Cuánto querés ahorrar?',
		'¿Dónde querés cuidar el gasto?',
		'Tu plan'
	];
	const stepHref = (n: number) => `/plan/setup?step=${n}`;
</script>

<svelte:head>
	<title>Crear plan · Gastar</title>
</svelte:head>

<PageHeader
	title="Crear plan en {CURRENCY_NAME[data.currency]}"
	close={{ href: resolve('/plan'), label: 'Cerrar' }}
/>

{#snippet bar(submitLabel: string, nextHref?: string)}
	<FormActions
		cancelHref={data.step === 1 ? '/plan' : stepHref(data.step - 1)}
		cancelLabel={data.step === 1 ? 'Cancelar' : 'Atrás'}
		{submitLabel}
		submitHref={nextHref}
	/>
{/snippet}

{#snippet head()}
	<SectionHeader title={titles[data.step - 1]} />
{/snippet}

<div class="wizard">
	<ol class="steps" aria-label="Pasos">
		{#each titles as label, i (label)}
			<li
				class:done={i + 1 < data.step}
				class:current={i + 1 === data.step}
				aria-current={i + 1 === data.step ? 'step' : undefined}
			>
				<span class="visually-hidden">{i + 1}. {label}</span>
			</li>
		{/each}
	</ol>
	<CardEyebrow>Paso {data.step} de {WIZARD_STEPS}</CardEyebrow>

	{#if data.step <= 2}
		{@const income = data.step === 1}
		{@render head()}
		<p class="muted small">
			{income ? 'Lo que cobrás todos los meses.' : 'Lo que pagás todos los meses.'}
		</p>
		{#if data.active.length}
			<ListCard>
				{#each data.active as r (r.id)}
					<RecurringRow row={r} currency={data.currency} wizard={data.step} />
				{/each}
			</ListCard>
		{:else}
			<EmptyState icon="plan" description={income ? 'Sin ingresos fijos.' : 'Sin pagos fijos.'} />
		{/if}
		<div class="add">
			<ActionLink
				href={income
					? '/plan/recurring/new?type=income&wizard=1'
					: '/plan/recurring/new?type=outcome&wizard=2'}
				label="Agregar"
			/>
		</div>
		{#if data.inactive.length}
			<SectionHeader level={3} title="Inactivos" />
			<ListCard>
				{#each data.inactive as r (r.id)}
					<RecurringRow row={r} currency={data.currency} wizard={data.step} />
				{/each}
			</ListCard>
		{/if}
		{@render bar('Siguiente', stepHref(data.step + 1))}
	{:else if data.step === 3}
		<SectionHeader title={titles[2]} />
		<p class="muted small">Lo apartamos antes de calcular cuánto podés gastar.</p>
		<form method="POST" action="?/savings" use:enhance class="wizard" novalidate>
			<SavingsFields
				income={data.income}
				currency={data.currency}
				initial={data.savings}
				error={form?.message}
			/>
			{@render bar('Siguiente')}
		</form>
	{:else if data.step === 4}
		{@render head()}
		<p class="muted small">Topes de gasto por categoría.</p>
		{#if data.canSuggest}
			<form method="POST" action="?/suggested" use:enhance class="suggest">
				<Button type="submit" variant="outline">Usar sugeridos</Button>
			</form>
		{/if}
		<LimitList limits={data.limits} currency={data.currency} wizard={4} />
		<div class="add"><ActionLink href="/plan/limits/new?wizard=4" label="Agregar" /></div>
		{@render bar('Siguiente', stepHref(5))}
	{:else}
		{@const s = data.summary!}
		<SectionHeader title="{titles[4]} para {data.monthName}" />
		<SummaryCard
			currency={data.currency}
			income={s.income}
			bills={s.bills}
			savings={s.savings}
			forSpending={s.forSpending}
			limits={s.limits}
		/>
		{#if s.forSpending < 0}
			<p class="warn">
				<CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" />Tus pagos y ahorro superan
				tus ingresos.
			</p>
		{/if}
		<form method="POST" action="?/finish" use:enhance class="wizard">
			<Card.Root class="gap-0 py-0">
				<SwitchRow
					id="repeat"
					name="repeat"
					label="Usar este plan todos los meses"
					checked={data.repeats}
				/>
			</Card.Root>
			{@render bar('Guardar')}
		</form>
	{/if}
</div>

<style>
	.wizard {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	/* Five-bar progress in the text colour (selection is primary, progress is not). */
	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 6px;
	}

	.steps li {
		height: 4px;
		border-radius: 2px;
		background: var(--muted);
	}

	.steps .done,
	.steps .current {
		background: var(--text);
	}

	/* A warning, not an error: muted box, alert icon in the text colour. */
	.warn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius);
		background: var(--muted);
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.muted {
		color: var(--text-muted);
	}

	.small {
		font-size: var(--font-size-sm);
	}

	.suggest {
		display: flex;
	}

	.add {
		display: flex;
	}
</style>
