<script lang="ts">
	import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
	import { onMount, tick, untrack } from 'svelte';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import { formatAmountInput, formatMoney, parseAmount } from '$lib/money';
	import { savingsFor } from '$lib/savings';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Kind = 'income' | 'outcome';
	type Row = {
		type: Kind;
		description: string;
		amount: string;
		accountId: string;
		categoryId: string;
		dayOfMonth: string;
	};

	const STEPS = ['Ingresos', 'Pagos fijos', 'Ahorro', 'Resumen'];
	let step = $state(1);
	// Without JS every step is visible and the form still submits.
	let js = $state(false);
	onMount(() => (js = true));
	$effect(() => {
		if (form?.step) step = form.step;
	});

	async function go(to: number) {
		step = to;
		await tick();
		document.getElementById(`s${to}`)?.focus();
	}

	const init = untrack(() => data);
	const blankRow = (type: Kind): Row => ({
		type,
		description: '',
		amount: '',
		accountId: init.accounts.length === 1 ? init.accounts[0].id : '',
		categoryId: '',
		dayOfMonth: '1'
	});

	let keep = $state(Object.fromEntries(init.rules.map((r) => [r.id, true])));
	let accepted = $state(Object.fromEntries(init.candidates.map((c) => [c.key, false])));
	// One blank row per kind, also rendered without JS; blank descriptions are ignored on save.
	let rows: Row[] = $state([blankRow('income'), blankRow('outcome')]);
	let extraIncome = $state(init.formatted.extraIncome);
	let savingsOption = $state(init.plan && init.plan.savings > 0 ? 'fixed' : '0');
	let savingsFixed = $state(
		init.plan?.savings ? formatAmountInput(init.plan.savings, init.currency) : ''
	);
	let repeat = $state(init.plan?.repeats ?? true);
	let limits = $state(
		Object.fromEntries(
			init.categories.map((c) => [c.id, c.limit ? formatAmountInput(c.limit, init.currency) : ''])
		)
	);

	const cents = (s: string) => (s.trim() === '' ? 0 : (parseAmount(s) ?? 0));
	const money = (c: number) => formatMoney(c, data.currency);
	const zero = $derived(data.currency === 'USD' ? '0,00' : '0');
	const sumOf = (t: Kind) =>
		data.rules.filter((r) => r.type === t && keep[r.id]).reduce((a, r) => a + r.amount, 0) +
		data.candidates
			.filter((c) => c.type === t && accepted[c.key])
			.reduce((a, c) => a + c.amount, 0) +
		rows
			.filter((r) => r.type === t && r.description.trim())
			.reduce((a, r) => a + cents(r.amount), 0);

	const income = $derived(sumOf('income') + cents(extraIncome));
	const bills = $derived(sumOf('outcome'));
	const savings = $derived(savingsFor(savingsOption, income, cents(savingsFixed)));
	const forSpending = $derived(income - bills - savings);
	const limitTotal = $derived(Object.values(limits).reduce((a, v) => a + cents(v), 0));

	// Income categories are hidden unless they already have a limit (saving would drop a hidden one).
	const limitCategories = $derived(
		data.categories.filter((c) => c.kind !== 'income' || c.limit !== null)
	);

	function useSuggested() {
		for (const c of limitCategories)
			if (c.suggested > 0) limits[c.id] = formatAmountInput(c.suggested, data.currency);
	}

	const savingsOptions = [
		{ value: '0', label: 'Nada' },
		{ value: '10', label: '10 %' },
		{ value: '20', label: '20 %' },
		{ value: 'fixed', label: 'Monto' }
	];
</script>

<svelte:head>
	<title>{data.plan?.current ? 'Editar plan' : 'Crear plan'} · Gastar</title>
</svelte:head>

<PageHeader
	title={data.plan?.current ? 'Editar plan' : 'Crear plan'}
	close={{ href: resolve('/plan'), label: 'Cerrar' }}
/>

{#snippet fixedStep(type: Kind)}
	{@const fixedRules = data.rules.filter((r) => r.type === type)}
	{@const candidates = data.candidates.filter((c) => c.type === type)}
	{@const noun = type === 'income' ? 'ingreso' : 'pago'}
	<p class="muted small">
		{type === 'income'
			? 'Lo que cobrás todos los meses: sueldo, alquileres, honorarios.'
			: 'Lo que pagás todos los meses: alquiler, servicios, suscripciones. Se descuenta de entrada.'}
	</p>

	{#if fixedRules.length > 0}
		<ul class="list-card checks">
			{#each fixedRules as r (r.id)}
				<li>
					<label class="check-row">
						<input type="hidden" name="shown" value={r.id} />
						<Checkbox name="keep" value={r.id} bind:checked={keep[r.id]} />
						<span class="text">
							<span class="title">{r.description}</span>
							<span class="sub">Día {r.dayOfMonth} · {r.accountName}</span>
						</span>
						<span class="amount"><Money cents={r.amount} currency={data.currency} /></span>
					</label>
				</li>
			{/each}
		</ul>
	{/if}

	{#if candidates.length > 0}
		<h3 class="sub-head">Detectamos que se repiten</h3>
		<ul class="list-card checks">
			{#each candidates as c (c.key)}
				<li>
					<label class="check-row">
						<Checkbox name="candidate" value={c.key} bind:checked={accepted[c.key]} />
						<span class="text">
							<span class="title">{c.description}</span>
							<span class="sub">Últimos 3 meses · día {c.dayOfMonth} · {c.categoryName}</span>
						</span>
						<span class="amount"><Money cents={c.amount} currency={data.currency} /></span>
					</label>
				</li>
			{/each}
		</ul>
	{/if}

	{#each rows as row, i (i)}
		{#if row.type === type}
			<fieldset class="new-row">
				<legend class="visually-hidden">Nuevo {noun}</legend>
				<input type="hidden" name="new_type" value={row.type} />
				<Field.Field>
					<Field.Label for="new_description_{i}">Descripción</Field.Label>
					<Input
						id="new_description_{i}"
						name="new_description"
						maxlength={DESCRIPTION_MAX_LENGTH}
						autocomplete="off"
						bind:value={row.description}
					/>
				</Field.Field>
				<div class="pair">
					<Field.Field>
						<Field.Label for="new_amount_{i}">Monto</Field.Label>
						<Input
							id="new_amount_{i}"
							name="new_amount"
							inputmode="decimal"
							placeholder={zero}
							autocomplete="off"
							bind:value={row.amount}
						/>
					</Field.Field>
					<Field.Field>
						<Field.Label for="new_dayOfMonth_{i}">Día</Field.Label>
						<Input
							id="new_dayOfMonth_{i}"
							name="new_dayOfMonth"
							type="number"
							min="1"
							max="31"
							bind:value={row.dayOfMonth}
						/>
					</Field.Field>
				</div>
				<div class="pair">
					<Field.Field>
						<Field.Label for="new_accountId_{i}">Cuenta</Field.Label>
						<NativeSelect.Root
							id="new_accountId_{i}"
							name="new_accountId"
							class="w-full"
							bind:value={row.accountId}
						>
							<NativeSelect.Option value="">Elegir</NativeSelect.Option>
							{#each data.accounts as a (a.id)}
								<NativeSelect.Option value={a.id}>{a.name}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</Field.Field>
					<Field.Field>
						<Field.Label for="new_categoryId_{i}">Categoría</Field.Label>
						<NativeSelect.Root
							id="new_categoryId_{i}"
							name="new_categoryId"
							class="w-full"
							bind:value={row.categoryId}
						>
							<NativeSelect.Option value="">Elegir</NativeSelect.Option>
							{#each data.categories.filter((c) => c.kind === null || c.kind === type) as c (c.id)}
								<NativeSelect.Option value={c.id}>{c.name}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</Field.Field>
				</div>
				{#if js}
					<Button
						type="button"
						variant="link"
						class="self-start text-destructive"
						onclick={() => rows.splice(i, 1)}
					>
						Quitar {noun}
					</Button>
				{/if}
			</fieldset>
		{/if}
	{/each}
	{#if js}
		<Button
			type="button"
			variant="link"
			class="self-start"
			onclick={() => rows.push(blankRow(type))}
		>
			+ Agregar {noun}
		</Button>
	{/if}
{/snippet}

<form method="POST" action="?/save" use:enhance class="wizard" novalidate>
	{#if js}
		<ol class="steps" aria-label="Pasos">
			{#each STEPS as label, i (label)}
				<li
					class:done={i + 1 < step}
					class:current={i + 1 === step}
					aria-current={i + 1 === step ? 'step' : undefined}
				>
					<span class="visually-hidden">{i + 1}. {label}</span>
				</li>
			{/each}
		</ol>
	{/if}

	{#if form?.message}<p class="message" role="alert">{form.message}</p>{/if}

	<section class="step" hidden={js && step !== 1} aria-labelledby="s1">
		<p class="eyebrow">Paso 1 de {STEPS.length}</p>
		<h2 id="s1" tabindex="-1">¿Cuánto cobrás por mes en {data.currency}?</h2>
		{@render fixedStep('income')}
		<Field.Field>
			<Field.Label for="extraIncome">Otros ingresos del mes (opcional)</Field.Label>
			<Input
				id="extraIncome"
				name="extraIncome"
				inputmode="decimal"
				placeholder={zero}
				autocomplete="off"
				bind:value={extraIncome}
			/>
		</Field.Field>
		<p class="total">Ingresos <strong><Money cents={income} currency={data.currency} /></strong></p>
	</section>

	<section class="step" hidden={js && step !== 2} aria-labelledby="s2">
		<p class="eyebrow">Paso 2 de {STEPS.length}</p>
		<h2 id="s2" tabindex="-1">¿Qué pagos fijos tenés?</h2>
		{@render fixedStep('outcome')}
		<p class="total">
			Pagos fijos <strong><Money cents={bills} currency={data.currency} /></strong>
		</p>
	</section>

	<section class="step" hidden={js && step !== 3} aria-labelledby="s3">
		<p class="eyebrow">Paso 3 de {STEPS.length}</p>
		<h2 id="s3" tabindex="-1">¿Cuánto querés ahorrar?</h2>
		<p class="muted small">Lo apartamos antes de calcular cuánto podés gastar.</p>
		<SegmentedControl
			name="savingsOption"
			options={savingsOptions}
			bind:value={savingsOption}
			labelledby="s3"
		/>
		{#if savingsOption === 'fixed' || !js}
			<Field.Field>
				<Field.Label for="savingsFixed">Monto a ahorrar</Field.Label>
				<Input
					id="savingsFixed"
					name="savingsFixed"
					inputmode="decimal"
					placeholder={zero}
					autocomplete="off"
					bind:value={savingsFixed}
				/>
			</Field.Field>
		{/if}
		<p class="total">Ahorro <strong><Money cents={savings} currency={data.currency} /></strong></p>
	</section>

	<section class="step" hidden={js && step !== 4} aria-labelledby="s4">
		<p class="eyebrow">Paso 4 de {STEPS.length}</p>
		<h2 id="s4" tabindex="-1">Tu plan para {data.monthName}</h2>
		<dl class="list-card equation">
			<div>
				<dt>Ingresos</dt>
				<dd><Money cents={income} currency={data.currency} kind="income" /></dd>
			</div>
			<div>
				<dt>Pagos fijos</dt>
				<dd><Money cents={bills} currency={data.currency} /></dd>
			</div>
			<div>
				<dt>Ahorro</dt>
				<dd><Money cents={savings} currency={data.currency} /></dd>
			</div>
			<div class="sum">
				<dt>Para gastar</dt>
				<dd><Money cents={forSpending} currency={data.currency} /></dd>
			</div>
		</dl>
		{#if forSpending < 0}
			<p class="warn">
				<CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" />Tus pagos y ahorro superan
				tus ingresos.
			</p>
		{/if}

		<Field.Field orientation="horizontal" class="min-h-11">
			<Checkbox id="repeat" name="repeat" value="on" bind:checked={repeat} />
			<Field.Label for="repeat">Usar este plan todos los meses</Field.Label>
		</Field.Field>

		<div class="section-head">
			<h3>Límites por categoría (opcional)</h3>
			{#if js && limitCategories.some((c) => c.suggested > 0)}
				<Button type="button" variant="link" onclick={useSuggested}>Usar sugeridos</Button>
			{/if}
		</div>
		<ul class="list-card limits">
			{#each limitCategories as c (c.id)}
				<li>
					<Field.Field class="p-4">
						<Field.Label for="limit_{c.id}">
							<span class="limit-name">
								{c.name}
								{#if c.suggested > 0}
									<span class="limit-hint">Promedio {money(c.suggested)}</span>
								{/if}
							</span>
						</Field.Label>
						<Input
							id="limit_{c.id}"
							name="limit_{c.id}"
							inputmode="decimal"
							autocomplete="off"
							placeholder="Sin límite"
							bind:value={limits[c.id]}
						/>
					</Field.Field>
				</li>
			{/each}
		</ul>
		{#if limitTotal > 0}
			<p class="muted xs">
				Asignado {money(limitTotal)} · sin asignar <Money
					cents={forSpending - limitTotal}
					currency={data.currency}
				/>
			</p>
		{/if}
	</section>

	<div class="bar">
		<div class="actions">
			{#if js && step > 1}
				<Button type="button" variant="outline" onclick={() => go(step - 1)}>Atrás</Button>
			{/if}
			{#if !js || step === STEPS.length}
				<Button type="submit">Guardar plan</Button>
			{:else}
				<Button type="button" onclick={() => go(step + 1)}>Siguiente</Button>
			{/if}
		</div>
	</div>
	{#if !js || step === 1}
		<div class="cancel">
			<Button href={resolve('/plan')} variant="outline">Cancelar</Button>
		</div>
	{/if}
</form>

{#if data.plan}
	<div class="delete">
		<ConfirmDialog
			triggerLabel="Eliminar plan"
			triggerVariant="destructive"
			title="¿Eliminar este plan?"
			confirmLabel="Eliminar"
			action="?/delete"
		>
			Se borran el plan y sus límites. Tus ingresos y pagos fijos se mantienen.
		</ConfirmDialog>
	</div>
{/if}

<style>
	.wizard,
	.step {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.step[hidden] {
		display: none;
	}

	.eyebrow {
		margin-bottom: calc(var(--space-3) * -1);
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	h2 {
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 500;
		letter-spacing: -0.015em;
		line-height: 1.15;
	}

	h2:focus {
		outline: none;
	}

	/* Four-bar progress in the text colour (selection is primary, progress is not). */
	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
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

	.message {
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--negative);
		border-radius: var(--radius);
		color: var(--negative);
		font-size: var(--font-size-sm);
		font-weight: 500;
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

	.xs {
		font-size: var(--font-size-xs);
		overflow-wrap: anywhere;
	}

	.sub-head,
	h3 {
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.checks li + li,
	.limits li + li {
		border-top: 1px solid var(--border);
	}

	.check-row {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		min-height: 3rem;
		padding: var(--space-2) var(--space-4);
		color: var(--text);
		cursor: pointer;
	}

	.text {
		flex: 1 1 6rem;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.title {
		font-size: var(--font-size-sm);
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.sub {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}

	.amount {
		font-size: var(--font-size-sm);
		text-align: end;
	}

	.new-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin: 0;
		padding: var(--space-4);
		min-width: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.pair {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
		gap: var(--space-3);
	}

	.total {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--space-1) var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border);
		font-size: var(--font-size-sm);
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

	.limit-name {
		overflow-wrap: anywhere;
	}

	.limit-hint {
		display: block;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	/* Sticky bar: full-bleed, pinned to the bottom of the viewport (no tab bar on this screen). */
	.bar {
		position: sticky;
		bottom: 0;
		z-index: 2;
		margin-inline: calc(var(--gutter, var(--space-5)) * -1);
		padding: var(--space-3) var(--gutter, var(--space-5))
			calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--bg);
		box-shadow: 0 -1px 0 var(--border);
	}

	.actions {
		display: flex;
		gap: var(--space-3);
	}

	.actions :global(.btn) {
		flex: 1;
	}

	.cancel {
		display: flex;
		justify-content: center;
	}

	.delete {
		display: flex;
		margin-top: var(--space-5);
		padding-top: var(--space-5);
		border-top: 1px solid var(--border);
	}
</style>
