<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { autosave } from '#lib/autosave.ts';
	import { toneOf } from '#lib/appearance.ts';
	import { CURRENCY_LABEL, formatAmountInput, formatMoney } from '#lib/money.ts';
	import { upOnClick } from '#lib/nav-stack.svelte.ts';
	import { limitPace, limitPercent, PLAN_STATUS_LABEL, PLAN_TONE } from '#lib/plan.ts';
	import { withWizard } from '#lib/plan-wizard.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { closeAfterDelete, formScreen } from '#lib/components/forms/form-enhance.ts';
	import Glyph from '#lib/components/base/Glyph.svelte';
	import InlineText from '#lib/components/InlineText.svelte';
	import Meter from '#lib/components/base/Meter.svelte';
	import Amount from '#lib/components/base/Amount.svelte';
	import Status from '#lib/components/base/Status.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { PageData } from './$types';

	/**
	 * A category limit's detail and edit in one: the meter on top, the amount changes on tap and saves on
	 * its own (`?/update`) with a Deshacer toast; "Usar promedio" saves the same way. A drawer over the
	 * plan (shallow route) or the full /plan/limits/<id> page, as the enclosing FormScreen says.
	 */
	let {
		data,
		back = '/plan',
		wizard
	}: {
		data: PageData;
		/** Page variant: where Listo and a delete go (unresolved path). */
		back?: string;
		/** Page variant: wizard step the limit was opened from (the delete returns there). */
		wizard?: number;
	} = $props();

	const screen = formScreen();
	const drawer = screen.variant === 'drawer';
	const currency = $derived(data.currency);
	const path = $derived(resolve(`/plan/limits/${data.category.id}` as ''));

	// The limit in cents: set by a save or an undo (the preloaded drawer data does not reload).
	let cents = $state<number | null>(untrack(() => data.progress?.amount ?? null));
	const spent = $derived(data.progress?.spent ?? 0);
	const amountText = $derived(cents === null ? data.amount : formatAmountInput(cents, currency));
	const limit = $derived(cents ?? data.progress?.amount ?? 0);
	const pace = $derived(limitPace(spent, limit, data.elapsedShare));
	const pct = $derived(Math.min(100, limitPercent(spent, limit)));

	let error = $state('');

	async function save(next: string): Promise<string | null> {
		if (next === amountText) return null;
		error = '';
		// A failure shows under the amount (InlineText keeps the old value and the message).
		return autosave<{ amount: number }>({
			path: `${path}?/update`,
			fields: { amount: next },
			previous: { amount: amountText },
			apply: (res) => (cents = res.amount)
		});
	}

	/** Drawer: the delete's answer (the page follows its redirect). */
	const deleted = closeAfterDelete(
		() => screen.onclose?.(),
		() => (error = 'No se pudo eliminar el límite.')
	);
</script>

<div class="detail">
	<div class="meter-block">
		<div class="line">
			<span class="who">
				<Glyph icon={data.category.icon} tone={toneOf(data.category.color)} size="chip" />
				<span class="name">Límite de {data.category.name}</span>
			</span>
			{#if pace.over}<Status tone={PLAN_TONE.over} label={PLAN_STATUS_LABEL.over} />
			{:else if pace.fast}<Status tone={PLAN_TONE.warn} label={PLAN_STATUS_LABEL.warn} />{/if}
		</div>
		<p class="of">
			<span class="spent"><Amount cents={spent} {currency} /></span> de
			<Amount cents={limit} {currency} />
		</p>
		<Meter
			percent={pct}
			tone={pace.over ? 'expense' : toneOf(data.category.color)}
			label="Límite de {data.category.name}"
			valueText="{formatMoney(spent, currency)} de {formatMoney(limit, currency)}"
		/>
	</div>

	<div class="amount">
		<InlineText label="Monto del límite" inputmode="decimal" value={amountText} onsave={save}>
			{#snippet display()}<Amount cents={limit} {currency} />{/snippet}
		</InlineText>
		{#if data.suggested > 0 && data.suggested !== limit}
			<Button
				type="button"
				variant="ghost"
				class="average"
				onclick={async () => {
					const err = await save(formatAmountInput(data.suggested, currency));
					if (err) error = err;
				}}
			>
				Usar promedio · {formatMoney(data.suggested, currency)}
			</Button>
		{/if}
	</div>

	<ul class="card">
		<li class="static">
			<span>Categoría</span>
			<span class="value">
				<Glyph icon={data.category.icon} tone={toneOf(data.category.color)} size="chip" />
				<span class="name">{data.category.name}</span>
			</span>
		</li>
		<li class="static">
			<span>Moneda</span>
			<span class="value">{CURRENCY_LABEL[currency]}</span>
		</li>
	</ul>

	{#if error}<p class="error" role="alert">{error}</p>{/if}

	<div class="actions">
		<ConfirmDialog
			triggerLabel="Eliminar límite"
			triggerVariant="destructive"
			triggerClass="w-full"
			title="¿Eliminar este límite?"
			confirmLabel="Eliminar"
			action={drawer ? `${path}?/delete` : withWizard('?/delete', wizard)}
			closeOnFailure={drawer}
			ondone={drawer ? deleted : undefined}
		>
			Esta acción no se puede deshacer.
		</ConfirmDialog>
		{#if drawer}
			<Button class="w-full" onclick={() => screen.onclose?.()}>Listo</Button>
		{:else}
			<Button class="w-full" href={resolve(back as '')} onclick={upOnClick(resolve(back as ''))}
				>Listo</Button
			>
		{/if}
	</div>
</div>

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding: var(--space-2) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
	}

	.meter-block {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.who {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		font-weight: 600;
	}

	.of {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.spent {
		color: var(--text);
		font-weight: 600;
	}

	.amount {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		font-family: var(--font-display);
		font-size: var(--font-size-hero);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.amount :global(.average) {
		font-family: var(--font-body);
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--link);
	}

	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--card-edge);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.static {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
	}

	.value {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		font-weight: 500;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.error {
		margin: 0;
		color: var(--negative);
		font-size: var(--font-size-sm);
		text-align: center;
	}

	.actions {
		display: grid;
		gap: var(--space-3);
	}
</style>
