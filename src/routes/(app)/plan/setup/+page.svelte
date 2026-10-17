<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormActions from '$lib/components/FormActions.svelte';
	import CardEyebrow from '$lib/components/CardEyebrow.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import Money from '$lib/components/Money.svelte';
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
		'Límites por categoría',
		'Tu plan'
	];
	const stepHref = (n: number) => `/plan/setup?step=${n}`;
</script>

<svelte:head>
	<title>Crear plan · Gastar</title>
</svelte:head>

<PageHeader title="Crear plan" close={{ href: resolve('/plan'), label: 'Cerrar' }} />

{#snippet bar(submitLabel: string, nextHref?: string)}
	<FormActions
		cancelHref={data.step === 1 ? '/plan' : stepHref(data.step - 1)}
		cancelLabel={data.step === 1 ? 'Cancelar' : 'Atrás'}
		{submitLabel}
		submitHref={nextHref}
	/>
{/snippet}

{#snippet head(add: string)}
	<SectionHeader title={titles[data.step - 1]} action={{ href: add }} />
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
		{@render head(
			income
				? '/plan/recurring/new?type=income&wizard=1'
				: '/plan/recurring/new?type=outcome&wizard=2'
		)}
		<p class="muted small">
			{income
				? 'Lo que cobrás todos los meses: sueldo, alquileres, honorarios.'
				: 'Lo que pagás todos los meses: alquiler, servicios, suscripciones. Se descuenta de entrada.'}
		</p>
		{#if data.active.length}
			<ListCard>
				{#each data.active as r (r.id)}
					<RecurringRow row={r} currency={data.currency} wizard={data.step} />
				{/each}
			</ListCard>
		{:else}
			<p class="muted">{income ? 'Sin ingresos fijos.' : 'Sin pagos fijos.'}</p>
		{/if}
		{#if data.inactive.length}
			<h3>Inactivos</h3>
			<ListCard>
				{#each data.inactive as r (r.id)}
					<RecurringRow row={r} currency={data.currency} wizard={data.step} />
				{/each}
			</ListCard>
		{/if}
		{@render bar('Siguiente', stepHref(data.step + 1))}
	{:else if data.step === 3}
		<h2>{titles[2]}</h2>
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
		{@render head('/plan/limits/new?wizard=4')}
		<p class="muted small">
			Opcional: fijá un tope de gasto para las categorías que quieras cuidar.
		</p>
		{#if data.canSuggest}
			<form method="POST" action="?/suggested" use:enhance class="suggest">
				<Button type="submit" variant="outline">Usar sugeridos</Button>
			</form>
		{/if}
		<LimitList limits={data.limits} currency={data.currency} wizard={4} />
		{@render bar('Siguiente', stepHref(5))}
	{:else}
		{@const s = data.summary!}
		<h2>{titles[4]} para {data.monthName}</h2>
		<dl class="detail-card equation">
			<div>
				<dt>Ingresos</dt>
				<dd><Money cents={s.income} currency={data.currency} tone="flow" direction="income" /></dd>
			</div>
			<div>
				<dt>Pagos fijos</dt>
				<dd><Money cents={-s.bills} currency={data.currency} tone="flow" direction="outcome" /></dd>
			</div>
			<div>
				<dt>Ahorro</dt>
				<dd><Money cents={s.savings} currency={data.currency} /></dd>
			</div>
			<div class="sum">
				<dt>Para gastar</dt>
				<dd><Money cents={s.forSpending} currency={data.currency} /></dd>
			</div>
		</dl>
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
			{@render bar('Guardar plan')}
		</form>
	{/if}
</div>

<style>
	.wizard {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	h3 {
		font-size: var(--font-size-sm);
		font-weight: 600;
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

	.equation {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		font-size: var(--font-size-sm);
	}

	.equation div {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--space-1) var(--space-3);
	}

	.equation dt {
		color: var(--text-muted);
	}

	.equation dd {
		margin: 0;
		margin-inline-start: auto;
		text-align: end;
	}

	.equation .sum {
		padding-top: var(--space-2);
		border-top: 1px solid var(--border);
		font-weight: 600;
	}
</style>
