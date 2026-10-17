<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Item from '$lib/components/ui/item/index.js';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
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
	const stepHref = (n: number) => resolve(`/plan/setup?step=${n}`);
</script>

<svelte:head>
	<title>Crear plan · Gastar</title>
</svelte:head>

<PageHeader title="Crear plan" close={{ href: resolve('/plan'), label: 'Cerrar' }} />

{#snippet bar(submitLabel: string, nextHref?: string)}
	<div class="bar">
		{#if data.step === 1}
			<Button href={resolve('/plan')} variant="outline" class="h-auto min-h-11 min-w-0 flex-1"
				>Cancelar</Button
			>
		{:else}
			<Button
				href={stepHref(data.step - 1)}
				variant="outline"
				class="h-auto min-h-11 min-w-0 flex-1">Atrás</Button
			>
		{/if}
		{#if nextHref}
			<Button href={nextHref} class="h-auto min-h-11 min-w-0 flex-[2]">{submitLabel}</Button>
		{:else}
			<Button type="submit" class="h-auto min-h-11 min-w-0 flex-[2]">{submitLabel}</Button>
		{/if}
	</div>
{/snippet}

{#snippet head(add: string)}
	<div class="section-head">
		<h2>{titles[data.step - 1]}</h2>
		<a class="add" href={resolve(add as '/')}>Agregar</a>
	</div>
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
	<p class="eyebrow">Paso {data.step} de {WIZARD_STEPS}</p>

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
			<Item.Group
				class="gap-0 overflow-hidden rounded-(--radius-card) border border-(--border) bg-(--surface) shadow-(--shadow-1)"
			>
				{#each data.active as r (r.id)}
					<RecurringRow row={r} currency={data.currency} wizard={data.step} />
				{/each}
			</Item.Group>
		{:else}
			<p class="muted">{income ? 'Sin ingresos fijos.' : 'Sin pagos fijos.'}</p>
		{/if}
		{#if data.inactive.length}
			<h3>Inactivos</h3>
			<Item.Group
				class="gap-0 overflow-hidden rounded-(--radius-card) border border-(--border) bg-(--surface) shadow-(--shadow-1)"
			>
				{#each data.inactive as r (r.id)}
					<RecurringRow row={r} currency={data.currency} wizard={data.step} />
				{/each}
			</Item.Group>
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
			<Field.Field orientation="horizontal" class="min-h-11">
				<Checkbox id="repeat" name="repeat" value="on" checked={data.repeats} />
				<Field.Label for="repeat">Usar este plan todos los meses</Field.Label>
			</Field.Field>
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

	.eyebrow {
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	h3 {
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.add {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		color: var(--text);
		font-weight: 500;
		text-decoration: underline;
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

	/* Sticky bar: full-bleed, pinned to the bottom of the viewport (no tab bar on this screen). */
	.bar {
		display: flex;
		gap: var(--space-3);
		position: sticky;
		bottom: 0;
		z-index: 2;
		margin-inline: calc(var(--gutter, var(--space-5)) * -1);
		padding: var(--space-3) var(--gutter, var(--space-5))
			calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--bg);
		box-shadow: 0 -1px 0 var(--border);
	}
</style>
