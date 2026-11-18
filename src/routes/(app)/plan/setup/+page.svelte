<script lang="ts">
	import { untrack } from 'svelte';
	import { formatMoney } from '#lib/money.ts';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { enhance } from '$app/forms';
	import { followRedirect } from '#lib/nav-stack.svelte.ts';
	import { resolve } from '$app/paths';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import FormActions from '#lib/components/FormActions.svelte';
	import CardEyebrow from '#lib/components/CardEyebrow.svelte';
	import ActionLink from '#lib/components/ActionLink.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import ListRow from '#lib/components/ListRow.svelte';
	import Money from '#lib/components/Money.svelte';
	import SwitchRow from '#lib/components/SwitchRow.svelte';
	import SectionHeader from '#lib/components/SectionHeader.svelte';
	import { openShallow } from '#lib/open-shallow.ts';
	import { PLAN_CURRENCY } from '#lib/plan.ts';
	import {
		setupStepHref,
		WIZARD_STEPS,
		WIZARD_TITLES,
		withWizard,
		wizardStep
	} from '#lib/plan-wizard.ts';
	import LimitList from '../LimitList.svelte';
	import RecurringRow from '../RecurringRow.svelte';
	import SavingsOptions from '../SavingsOptions.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Steps share this component, so the switch starts on until step 5 is the first one loaded.
	let repeat = $state(untrack(() => data.repeats ?? true));
	const perDay = $derived(data.summary?.perDay ?? 0);
	const newRule = (type: 'income' | 'outcome') =>
		withWizard(`/plan/recurring/new?type=${type}`, data.step);
</script>

<svelte:head>
	<title>Crear plan · Gastar</title>
</svelte:head>

{#snippet bar(submitLabel: string, nextHref?: string)}
	<FormActions
		cancelHref={data.step === 1 ? '/plan' : setupStepHref(data.step - 1)}
		cancelLabel={data.step === 1 ? 'Cancelar' : 'Atrás'}
		{submitLabel}
		submitHref={nextHref}
	/>
{/snippet}

{#snippet question()}
	<h1 class="question">{WIZARD_TITLES[data.step - 1]}</h1>
{/snippet}

{#snippet add(href: string, key: 'newRule' | 'newLimit')}
	<ActionLink {href} label="+ Agregar" onclick={(e) => openShallow(e, resolve(href as ''), key)} />
{/snippet}

{#snippet addRule()}
	{@render add(newRule(data.step === wizardStep('income') ? 'income' : 'outcome'), 'newRule')}
{/snippet}

{#snippet addLimit()}
	{@render add(withWizard('/plan/limits/new', wizardStep('limits')), 'newLimit')}
{/snippet}

<div class="wizard root">
	<ol class="steps" aria-label="Pasos">
		{#each WIZARD_TITLES as label, i (label)}
			<li
				class:done={i + 1 < data.step}
				class:current={i + 1 === data.step}
				aria-current={i + 1 === data.step ? 'step' : undefined}
			>
				<span class="visually-hidden">{i + 1}. {label}</span>
			</li>
		{/each}
	</ol>
	<CardEyebrow>
		Plan · paso {data.step} de {WIZARD_STEPS.length}
	</CardEyebrow>

	{#if data.step === 1 || data.step === 2}
		{@const income = data.step === 1}
		{@render question()}
		<section class="group">
			<SectionHeader level={3} title={income ? 'Ingresos fijos' : 'Pagos fijos'} aside={addRule} />
			<ListCard>
				{#each data.active as r (r.id)}
					<RecurringRow row={r} wizard={data.step} />
				{:else}
					<p class="empty">{income ? 'Sin ingresos fijos.' : 'Sin pagos fijos.'}</p>
				{/each}
			</ListCard>
			{#if data.active.length}
				<p class="total">
					<span>Total</span>
					<Money
						cents={income ? data.total : -data.total}
						currency={PLAN_CURRENCY}
						tone="flow"
						direction={income ? 'income' : 'outcome'}
					/>
				</p>
			{/if}
		</section>
		{#if data.inactive.length}
			<SectionHeader level={3} title="Inactivos" />
			<ListCard>
				{#each data.inactive as r (r.id)}
					<RecurringRow row={r} wizard={data.step} />
				{/each}
			</ListCard>
		{/if}
		{#if data.suggestions.length}
			<SectionHeader level={3} title="Detectamos que se repiten" />
			<p class="muted small">Tocá uno para agregarlo como pago fijo.</p>
			<ListCard>
				{#each data.suggestions as s (s.id)}
					{@const href = `${withWizard('/plan/recurring/new?type=outcome', wizardStep('bills'))}&suggestion=${s.id}`}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
					<div
						onclick={(e) =>
							(e.target as Element).closest('a') && openShallow(e, resolve(href as ''), 'newRule')}
					>
						<ListRow
							href={resolve(href as '')}
							lead={{ letter: s.description.charAt(0).toUpperCase(), color: null }}
							title={s.description}
						>
							{#snippet value()}
								<Money cents={-s.amount} currency={s.currency} tone="flow" direction="outcome" />
							{/snippet}
							{#snippet meta()}Día {s.dayOfMonth} · {s.accountName}{/snippet}
						</ListRow>
					</div>
				{/each}
			</ListCard>
		{/if}
		{@render bar('Siguiente', setupStepHref(data.step + 1))}
	{:else if data.step === 3}
		{@render question()}
		<form
			method="POST"
			action="?/savings"
			use:enhance={() => (input) => followRedirect(input, { reset: false })}
			class="wizard"
			novalidate
		>
			<Card.Root class="gap-0 py-2">
				<SavingsOptions
					mode="form"
					currency={PLAN_CURRENCY}
					income={data.income}
					initial={data.savings}
					base={data.savingsBase.base}
					daysLeft={data.savingsBase.daysLeft}
					error={form?.formError}
				/>
			</Card.Root>
			{#if data.income === 0}
				<p class="warn">
					<CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" />Sin ingresos fijos, el plan
					da {formatMoney(0, PLAN_CURRENCY)} por día.
				</p>
			{/if}
			{@render bar('Siguiente')}
		</form>
	{:else if data.step === 4}
		{@render question()}
		{#if data.canSuggest}
			<form method="POST" action="?/suggested" use:enhance class="suggest">
				<Button type="submit" variant="outline" class="w-full">Usar sugeridos</Button>
			</form>
		{/if}
		<section class="group">
			<SectionHeader level={3} title="Límites" aside={addLimit} />
			<LimitList limits={data.limits} wizard={wizardStep('limits')} />
		</section>
		{@render bar('Siguiente', setupStepHref(wizardStep('summary')))}
	{:else}
		{@const s = data.summary!}
		<h1 class="question">{WIZARD_TITLES[data.step - 1]} para {data.monthName}</h1>
		<Card.Root class="gap-0 overflow-hidden py-0">
			<dl class="figures">
				<div class="kv">
					<dt>Ingresos</dt>
					<dd>
						<Money cents={s.income} currency={PLAN_CURRENCY} tone="flow" direction="income" />
					</dd>
				</div>
				<div class="kv">
					<dt>Pagos fijos</dt>
					<dd>
						<Money cents={-s.bills} currency={PLAN_CURRENCY} tone="flow" direction="outcome" />
					</dd>
				</div>
				<div class="kv">
					<dt>Ahorro</dt>
					<dd><Money cents={s.savings} currency={PLAN_CURRENCY} /></dd>
				</div>
				{#each s.limits as l (l.categoryId)}
					<div class="kv">
						<dt>Límite · {l.name}</dt>
						<dd><Money cents={l.amount} currency={l.currency} /></dd>
					</div>
				{:else}
					<div class="kv">
						<dt>Límites</dt>
						<dd>Sin límites</dd>
					</div>
				{/each}
				<div class="kv sum">
					<dt>Para gastar</dt>
					<dd><Money cents={s.forSpending} currency={PLAN_CURRENCY} /></dd>
				</div>
				<div class="kv">
					<dt>Por día</dt>
					<dd>≈ <Money cents={perDay} currency={PLAN_CURRENCY} /></dd>
				</div>
			</dl>
		</Card.Root>
		{#if s.forSpending < 0}
			<p class="warn">
				<CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" />Tus pagos y ahorro superan
				tus ingresos.
			</p>
		{/if}
		<form
			method="POST"
			action="?/finish"
			use:enhance={() => (input) => followRedirect(input)}
			class="wizard"
		>
			<Card.Root class="gap-0 py-0">
				<SwitchRow
					id="repeat"
					name="repeat"
					label="Usar este plan todos los meses"
					bind:checked={repeat}
					describedby="repeat-note"
				/>
			</Card.Root>
			<p id="repeat-note" class="muted small">
				{repeat
					? 'El plan se repite cada mes con tus ingresos y pagos fijos.'
					: `El plan vale solo para ${data.monthName}.`}
			</p>
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

	/* No header on this screen: the progress bar starts the page. */
	.root {
		padding-top: calc(var(--space-4) + env(safe-area-inset-top));
	}

	/* The footer sits at the bottom of the screen, 30px up, like the canvas (no tab bar here, so the
	   root takes back .content's bottom padding, see (app)/+layout.svelte). Step forms grow so
	   their footer can drop too. */
	.root {
		box-sizing: border-box;
		min-height: 100dvh;
		margin-bottom: calc(-1 * (var(--space-8) + 4.5rem + env(safe-area-inset-bottom)));
		padding-bottom: calc(18px + env(safe-area-inset-bottom));
	}

	.root > form {
		flex: 1;
	}

	.wizard :global(.bar) {
		margin-top: auto;
	}

	/* Cancelar/Atrás 1 : Siguiente 2. */
	.wizard :global(.bar > :last-child) {
		flex-grow: 2;
	}

	.question {
		font-family: var(--font-display);
		font-size: var(--font-size-xl);
		font-weight: 500;
		letter-spacing: -0.015em;
		line-height: 1.2;
	}

	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		/* One equal column per step. */
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 4px;
	}

	.steps li {
		height: 4px;
		border-radius: 2px;
		background: var(--muted);
	}

	.steps .done,
	.steps .current {
		background: var(--primary);
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

	.empty {
		padding: var(--space-3) var(--space-4);
		color: var(--text-muted);
	}

	.total {
		display: flex;
		justify-content: space-between;
		padding: var(--space-3) var(--space-1) 0;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.figures {
		padding: 0 1.25rem;
		font-size: var(--font-size-sm);
	}

	.kv {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3rem;
	}

	.figures dt {
		font-weight: 500;
		color: var(--text-muted);
	}

	.figures dd {
		margin: 0;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.figures .sum dt,
	.figures .sum dd {
		color: var(--text);
		font-weight: 600;
	}
</style>
