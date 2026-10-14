<script lang="ts">
	import { NAME_MAX_LENGTH } from '$lib/limits';
	import { tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import * as Field from '$lib/components/ui/field/index.js';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import TextRow from '$lib/components/TextRow.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { SwatchKey } from '$lib/appearance';

	type Values = Partial<Record<'name' | 'color' | 'kind', string | null>>;

	let {
		initial,
		errors = {},
		mode,
		cancelHref
	}: {
		initial: Values;
		errors?: Partial<Record<keyof Values, string>>;
		mode: 'create' | 'edit';
		cancelHref: string;
	} = $props();

	let name = $state(untrack(() => initial.name ?? ''));
	let color = $state(untrack(() => (initial.color ?? 'green') as SwatchKey));
	let kind = $state(untrack(() => initial.kind ?? ''));
	const kindOptions = [
		{ value: 'outcome', label: 'Gasto' },
		{ value: 'income', label: 'Ingreso' },
		{ value: '', label: 'Ambos' }
	];

	// After a failed submit, move focus to the first field marked invalid.
	$effect(() => {
		if (!Object.values(errors).some(Boolean)) return;
		tick().then(() => {
			document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus();
		});
	});
</script>

<form method="POST" use:enhance class="form" novalidate>
	<ul class="card">
		<li class:bad={errors.name}>
			<TextRow
				id="name"
				name="name"
				label="Nombre"
				bind:value={name}
				placeholder="Agregar"
				maxlength={NAME_MAX_LENGTH}
				required
				error={errors.name}
				errorId="name-error"
			/>
		</li>

		<li class:bad={errors.kind}>
			<div class="row">
				<Field.Label id="kind-label" class="text-base font-normal">Tipo</Field.Label>
				<div class="seg">
					<SegmentedControl
						name="kind"
						options={kindOptions}
						bind:value={kind}
						labelledby="kind-label"
					/>
				</div>
			</div>
			{#if errors.kind}
				<p class="error et" role="alert"><Icon name="alert" size="1rem" />{errors.kind}</p>
			{/if}
		</li>

		<li class:bad={errors.color}>
			<ColorPicker name="color" legend="Color" bind:value={color} />
			{#if errors.color}
				<p class="error et" role="alert"><Icon name="alert" size="1rem" />{errors.color}</p>
			{/if}
		</li>
	</ul>

	<FormActions
		{cancelHref}
		submitLabel={mode === 'create' ? 'Crear categoría' : 'Guardar cambios'}
	/>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}

	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.card > li + li {
		border-top: 1px solid var(--border);
	}

	.card > li.bad {
		box-shadow: inset 3px 0 0 var(--negative);
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: 0 var(--space-4);
		font-size: var(--font-size-base);
		color: var(--text);
	}

	.seg {
		margin-inline-start: auto;
		flex: 0 1 15rem;
		min-width: 0;
		padding-block: var(--space-1);
	}

	.error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.et {
		padding: 0 var(--space-4) var(--space-3);
	}
</style>
