<script lang="ts">
	import { NAME_MAX_LENGTH } from '$lib/limits';
	import { tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
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
			<Field.Field class="p-4">
				<Field.Label for="name">Nombre</Field.Label>
				<Input
					id="name"
					name="name"
					type="text"
					maxlength={NAME_MAX_LENGTH}
					required
					autocomplete="off"
					placeholder="Agregar"
					bind:value={name}
					aria-invalid={errors.name ? 'true' : undefined}
					aria-describedby={errors.name ? 'name-error' : undefined}
				/>
				{#if errors.name}
					<Field.Error id="name-error" class="flex items-start gap-2">
						<Icon name="alert" size="1rem" />{errors.name}
					</Field.Error>
				{/if}
			</Field.Field>
		</li>
	</ul>

	<div class="field">
		<span id="kind-label" class="k">Tipo</span>
		<SegmentedControl name="kind" options={kindOptions} bind:value={kind} labelledby="kind-label" />
		{#if errors.kind}
			<p class="error" role="alert"><Icon name="alert" size="1rem" />{errors.kind}</p>
		{/if}
	</div>

	<div>
		<Card.Root>
			<Card.Content>
				<ColorPicker name="color" legend="Color" bind:value={color} />
			</Card.Content>
		</Card.Root>
		{#if errors.color}
			<p class="error pad" role="alert"><Icon name="alert" size="1rem" />{errors.color}</p>
		{/if}
	</div>

	<div class="bar">
		<Button type="submit" class="w-full"
			>{mode === 'create' ? 'Crear categoría' : 'Guardar cambios'}</Button
		>
	</div>
	<div class="cancel">
		<Button href={resolve(cancelHref as '/categories')} variant="outline">Cancelar</Button>
	</div>
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

	.card > li.bad {
		box-shadow: inset 3px 0 0 var(--negative);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.field .k {
		padding: 0 var(--space-4);
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.pad {
		padding: var(--space-2) var(--space-4) 0;
	}

	/* Sticky save bar: full-bleed, pinned to the bottom of the viewport (no tab bar on this screen). */
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

	.cancel {
		display: flex;
		justify-content: center;
	}
</style>
