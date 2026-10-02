<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import Field from '$lib/components/Field.svelte';
	import type { SwatchKey } from '$lib/appearance';

	type Values = Partial<Record<'name' | 'color', string | null>>;

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

	let color = $state(untrack(() => (initial.color ?? 'green') as SwatchKey));
</script>

<form method="POST" use:enhance class="form" novalidate>
	<Field label="Nombre" error={errors.name} errorId="name-error">
		<input
			name="name"
			type="text"
			maxlength="40"
			required
			autocomplete="off"
			value={initial.name ?? ''}
			aria-invalid={errors.name ? 'true' : undefined}
			aria-describedby={errors.name ? 'name-error' : undefined}
		/>
	</Field>

	<div>
		<ColorPicker name="color" legend="Color" bind:value={color} />
		{#if errors.color}<p class="error" role="alert">{errors.color}</p>{/if}
	</div>

	<div class="actions">
		<Button type="submit">{mode === 'create' ? 'Crear categoría' : 'Guardar cambios'}</Button>
		<Button href={resolve(cancelHref as '/categories')} variant="secondary">Cancelar</Button>
	</div>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
</style>
