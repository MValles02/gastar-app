<script lang="ts">
	import { resolve } from '$app/paths';
	import { autosave } from '#lib/autosave.ts';
	import { DESCRIPTION_MAX_LENGTH } from '#lib/constants.ts';
	import { formatMoney, toCurrency } from '#lib/money.ts';
	import { archived, categoriesFor } from '#lib/movement.ts';
	import { dueTone } from '#lib/plan.ts';
	import { withWizard } from '#lib/plan-wizard.ts';
	import { patchShallow } from '#lib/open-shallow.ts';
	import DetailLifecycle from '#lib/components/DetailLifecycle.svelte';
	import Group from '#lib/components/base/Group.svelte';
	import Row from '#lib/components/base/Row.svelte';
	import DayOfMonthPicker from '#lib/components/pickers/DayOfMonthPicker.svelte';
	import InlineText from '#lib/components/InlineText.svelte';
	import Amount from '#lib/components/base/Amount.svelte';
	import OptionPicker from '#lib/components/pickers/OptionPicker.svelte';
	import Status from '#lib/components/base/Status.svelte';
	import type { PageData } from './$types';

	/**
	 * A recurring rule's detail and edit in one: tapping a row or the amount changes it, and every change
	 * saves on its own (`?/update`) with a Deshacer toast. Desactivar / Activar and Eliminar (with confirm)
	 * sit below. Lives over the screen it was opened from as a drawer (shallow route) or as the full
	 * /plan/recurring/<id> page (the enclosing FormScreen).
	 */
	let { data }: { data: PageData } = $props();

	// A reload (Activar, Desactivar, Deshacer) brings the stored rule back in; a save sets it at once.
	let r = $derived(data);

	const income = $derived(r.type === 'income');
	const currency = $derived(toCurrency(r.currency));
	const path = $derived(resolve(`plan/recurring/${r.id}`));

	// What the update action stores, as the strings it takes (the server's `toFormValues`).
	const values = $derived<Record<string, string>>(r.values);

	const accounts = $derived(r.accounts.map((a) => ({ ...a, name: archived(a.name, a.archived) })));
	const categories = $derived(
		categoriesFor(r.categories, r.type, null).map((c) => ({
			...c,
			name: archived(c.name, c.archived)
		}))
	);

	let errors = $state<Record<string, string>>({});

	async function save(key: string, value: string) {
		if (value === values[key]) return null;
		const error = await autosave<{ rule: typeof data }>({
			path: `${path}?/update`,
			fields: { [key]: value },
			previous: { [key]: values[key] },
			apply: (res) => {
				r = { ...res.rule, wizard: data.wizard };
				patchShallow('rule', res.rule);
				errors = {};
			}
		});
		errors[key] = error ?? '';
		return error;
	}

	const noun = $derived(income ? 'ingreso' : 'pago');
</script>

{#snippet empty()}<p class="hint">Todavía no hay opciones.</p>{/snippet}

<div class="detail">
	<div class="top">
		<p class="kind">
			{income ? 'Ingreso fijo' : 'Pago fijo'}
			{#if r.archived}
				<Status tone="neutral" label="Desactivado" />
			{:else if r.cannotRegister}
				<Status tone="warning" label={r.inactiveReason ?? ''} />
			{:else if r.inactiveReason}
				<Status tone="neutral" label={r.inactiveReason} />
			{:else if r.thisMonth}
				<Status tone={dueTone(r.thisMonth.status)} label={r.thisMonth.label} />
			{/if}
		</p>
		<div class="amount {r.type}">
			<InlineText
				label="Monto"
				inputmode="decimal"
				value={values.amount}
				onsave={(next) => save('amount', next)}
			>
				{#snippet display()}
					<Amount
						cents={r.amount}
						{currency}
						tone={r.type === 'income' ? 'income' : r.type === 'outcome' ? 'expense' : 'neutral'}
					/>
				{/snippet}
			</InlineText>
		</div>
		{#if r.previousAmount !== null}<p class="before">
				Antes {formatMoney(r.previousAmount, currency)}
			</p>{/if}
	</div>

	<Group>
		<Row title="Descripción">
			{#snippet trailing()}
				<InlineText
					label="Descripción"
					value={values.description}
					maxlength={DESCRIPTION_MAX_LENGTH}
					required
					onsave={(next) => save('description', next)}
				>
					{#snippet display()}{r.description}{/snippet}
				</InlineText>
			{/snippet}
		</Row>
		<li>
			<OptionPicker
				name="accountId"
				legend="Cuenta"
				title="Elegí la cuenta"
				items={accounts}
				bind:value={() => values.accountId, (v) => void save('accountId', v)}
				placeholder="Elegir"
				error={errors.accountId}
				errorId="account-error"
				{empty}
			/>
		</li>
		<li>
			<OptionPicker
				name="categoryId"
				legend="Categoría"
				title="Elegí la categoría"
				items={categories}
				bind:value={() => values.categoryId, (v) => void save('categoryId', v)}
				placeholder="Elegir"
				error={errors.categoryId}
				errorId="category-error"
				{empty}
			/>
		</li>
		<li>
			<DayOfMonthPicker
				bind:value={() => values.dayOfMonth, (v) => void save('dayOfMonth', v)}
				error={errors.dayOfMonth}
			/>
		</li>
		{#if r.endsMonthLabel}
			<Row title="Última cuota">{#snippet trailing()}{r.endsMonthLabel}{/snippet}</Row>
		{/if}
	</Group>

	<DetailLifecycle
		{path}
		sheet="rule"
		can={{ canArchive: !r.archived, canUnarchive: r.archived, canDelete: true }}
		messages={{
			archive: 'Desactivar',
			archiveTitle: `¿Desactivar este ${noun} fijo?`,
			archiveBody: 'Podés activarlo de nuevo cuando quieras.',
			unarchive: 'Activar',
			deleteTitle: `¿Eliminar este ${noun} fijo?`,
			deleteBody: 'Los movimientos ya registrados se mantienen.'
		}}
		actions={{
			archive: `${path}?/archive`,
			unarchive: `${path}?/archive`,
			delete: withWizard(`${path}?/delete`, data.wizard)
		}}
		note={r.cannotRegister}
	/>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.top {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		text-align: center;
	}

	.kind {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.amount {
		max-width: 100%;
		font-family: var(--font-display);
		font-size: var(--font-size-hero);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.before {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.amount.outcome {
		color: var(--negative);
	}

	.amount.income {
		color: var(--positive);
	}

	.hint {
		padding: var(--space-4);
		color: var(--text-muted);
	}
</style>
