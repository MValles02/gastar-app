<script lang="ts">
	import { resolve } from '$app/paths';
	import { autosave } from '#lib/autosave.ts';
	import { DESCRIPTION_MAX_LENGTH } from '#lib/fields.ts';
	import { formatMoney } from '#lib/money.ts';
	import { categoriesFor } from '#lib/movement.ts';
	import { dueTone } from '#lib/plan.ts';
	import { withWizard } from '#lib/plan-wizard.ts';
	import DetailCard from '#lib/components/DetailCard.svelte';
	import DetailLifecycle from '#lib/components/DetailLifecycle.svelte';
	import DetailRow from '#lib/components/DetailRow.svelte';
	import DayOfMonthPicker from '#lib/components/pickers/DayOfMonthPicker.svelte';
	import InlineText from '#lib/components/InlineText.svelte';
	import Money from '#lib/components/Money.svelte';
	import OptionPicker from '#lib/components/pickers/OptionPicker.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import type { PageData } from './$types';

	/**
	 * A recurring rule's detail and edit in one: tapping a row or the amount changes it, and every change
	 * saves on its own (`?/update`) with a Deshacer toast. Desactivar / Activar and Eliminar (with confirm)
	 * sit below.
	 */
	let { data }: { data: PageData } = $props();

	// A reload (Activar, Desactivar, Deshacer) brings the stored rule back in; a save sets it at once.
	let r = $derived(data);

	const income = $derived(r.type === 'income');
	const currency = $derived(r.currency === 'USD' ? 'USD' : 'ARS');
	const path = $derived(resolve(`plan/recurring/${r.id}`));

	// What the update action stores, as the strings it takes (the server's `toFormValues`).
	const values = $derived<Record<string, string>>(r.values);

	const archived = (name: string, is: boolean) => (is ? `${name} · Archivada` : name);
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
				<StatusPill tone="neutral" label="Desactivado" />
			{:else if r.cannotRegister}
				<StatusPill tone="warning" label={r.inactiveReason ?? ''} />
			{:else if r.thisMonth}
				<StatusPill tone={dueTone(r.thisMonth.status)} label={r.thisMonth.label} />
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
					<Money cents={r.amount} {currency} tone="flow" direction={r.type} />
				{/snippet}
			</InlineText>
		</div>
		{#if r.previousAmount !== null}<p class="before">
				Antes {formatMoney(r.previousAmount, currency)}
			</p>{/if}
	</div>

	<DetailCard>
		<DetailRow label="Descripción">
			<InlineText
				label="Descripción"
				value={values.description}
				maxlength={DESCRIPTION_MAX_LENGTH}
				required
				onsave={(next) => save('description', next)}
			>
				{#snippet display()}{r.description}{/snippet}
			</InlineText>
		</DetailRow>
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
				errorId="day-error"
			/>
		</li>
	</DetailCard>

	<DetailLifecycle
		can={{ canArchive: !r.archived, canUnarchive: r.archived, canDelete: true }}
		messages={{
			archive: 'Desactivar',
			unarchive: 'Activar',
			deleteTitle: `¿Eliminar este ${noun} fijo?`,
			deleteBody: 'Los movimientos ya registrados se mantienen.'
		}}
		actions={{ unarchive: '?/archive', delete: withWizard('?/delete', data.wizard) }}
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
