<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Field from '$lib/components/Field.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import { formatAmountInput, formatMoney, parseAmount } from '$lib/money';
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
	// Same integer math as savingsFor on the server: 10 % / 20 % of income, whole units rounded down.
	const savings = $derived(
		savingsOption === '10'
			? Math.floor(income / 1000) * 100
			: savingsOption === '20'
				? Math.floor(income / 500) * 100
				: savingsOption === 'fixed'
					? cents(savingsFixed)
					: 0
	);
	const forSpending = $derived(income - bills - savings);
	const limitTotal = $derived(Object.values(limits).reduce((a, v) => a + cents(v), 0));

	function useSuggested() {
		for (const c of data.categories)
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
						<input type="checkbox" name="keep" value={r.id} bind:checked={keep[r.id]} />
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
						<input type="checkbox" name="candidate" value={c.key} bind:checked={accepted[c.key]} />
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
				<Field label="Descripción">
					<input
						name="new_description"
						maxlength="60"
						autocomplete="off"
						bind:value={row.description}
					/>
				</Field>
				<div class="pair">
					<Field label="Monto">
						<input
							name="new_amount"
							inputmode="decimal"
							placeholder={zero}
							autocomplete="off"
							bind:value={row.amount}
						/>
					</Field>
					<Field label="Día">
						<input
							name="new_dayOfMonth"
							type="number"
							min="1"
							max="31"
							bind:value={row.dayOfMonth}
						/>
					</Field>
				</div>
				<div class="pair">
					<Field label="Cuenta">
						<select name="new_accountId" bind:value={row.accountId}>
							<option value="">Elegir</option>
							{#each data.accounts as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
						</select>
					</Field>
					<Field label="Categoría">
						<select name="new_categoryId" bind:value={row.categoryId}>
							<option value="">Elegir</option>
							{#each data.categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
						</select>
					</Field>
				</div>
				{#if js}
					<button type="button" class="link danger" onclick={() => rows.splice(i, 1)}>
						Quitar {noun}
					</button>
				{/if}
			</fieldset>
		{/if}
	{/each}
	{#if js}
		<button type="button" class="link" onclick={() => rows.push(blankRow(type))}>
			+ Agregar {noun}
		</button>
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
		<Field label="Otros ingresos del mes (opcional)">
			<input
				name="extraIncome"
				inputmode="decimal"
				placeholder={zero}
				autocomplete="off"
				bind:value={extraIncome}
			/>
		</Field>
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
			<Field label="Monto a ahorrar">
				<input
					name="savingsFixed"
					inputmode="decimal"
					placeholder={zero}
					autocomplete="off"
					bind:value={savingsFixed}
				/>
			</Field>
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

		<Checkbox name="repeat" label="Usar este plan todos los meses" bind:checked={repeat} />

		<div class="section-head">
			<h3>Límites por categoría (opcional)</h3>
			{#if js && data.categories.some((c) => c.suggested > 0)}
				<button type="button" class="link" onclick={useSuggested}>Usar sugeridos</button>
			{/if}
		</div>
		<ul class="list-card limits">
			{#each data.categories as c (c.id)}
				<li>
					<label>
						<span class="limit-name">
							{c.name}
							{#if c.suggested > 0}
								<span class="limit-hint">Promedio {money(c.suggested)}</span>
							{/if}
						</span>
						<input
							name="limit_{c.id}"
							inputmode="decimal"
							autocomplete="off"
							placeholder="Sin límite"
							bind:value={limits[c.id]}
						/>
					</label>
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
				<Button type="button" variant="secondary" onclick={() => go(step - 1)}>Atrás</Button>
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
			<Button href={resolve('/plan')} variant="secondary">Cancelar</Button>
		</div>
	{/if}
</form>

{#if data.plan}
	<div class="delete">
		<ConfirmDialog
			triggerLabel="Eliminar plan"
			triggerVariant="danger"
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
		align-items: center;
		gap: var(--space-3);
		min-height: 3rem;
		padding: var(--space-2) var(--space-4);
		color: var(--text);
		cursor: pointer;
	}

	.check-row input {
		flex: none;
		width: 1.25rem;
		height: 1.25rem;
		accent-color: var(--primary);
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

	.check-row {
		flex-wrap: wrap;
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

	.link {
		align-self: flex-start;
		min-height: 2.75rem;
		padding: 0;
		background: none;
		border: 0;
		color: var(--text);
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-decoration: underline;
	}

	.link.danger {
		color: var(--negative);
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

	.limits label {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		padding: var(--space-2) var(--space-4);
	}

	.limit-name {
		flex: 1 1 8rem;
		min-width: 0;
		overflow-wrap: anywhere;
		color: var(--text);
	}

	.limit-hint {
		display: block;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.limits input {
		flex: none;
		width: 8rem;
		max-width: 100%;
		text-align: right;
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
