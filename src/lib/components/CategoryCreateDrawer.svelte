<script lang="ts" module>
	import type { CategoryIconKey, SwatchKey } from '$lib/appearance';

	export type CreatedCategory = {
		id: string;
		name: string;
		icon: CategoryIconKey;
		color: SwatchKey;
		kind: 'income' | 'outcome' | null;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { CATEGORY_ICONS } from '$lib/appearance';
	import { NAME_MAX_LENGTH } from '$lib/limits';
	import BottomDrawer from './BottomDrawer.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import IconBadge from './IconBadge.svelte';
	import IconPicker from './IconPicker.svelte';
	import SegmentedControl from './SegmentedControl.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	/**
	 * "+ Nueva categoría" from the movement drawer: a drawer stacked over it that posts to the existing
	 * `/categories/new` action and hands the created category back (the id comes from the redirect).
	 */
	let {
		open = $bindable(false),
		defaultKind,
		oncreated
	}: {
		open?: boolean;
		/** Preselected "Se usa para": the movement's type. */
		defaultKind: 'income' | 'outcome';
		oncreated: (category: CreatedCategory) => void;
	} = $props();

	const kindOptions = [
		{ value: 'outcome', label: 'Gastos' },
		{ value: 'income', label: 'Ingresos' },
		{ value: '', label: 'Ambos' }
	];

	let name = $state('');
	let color = $state<SwatchKey>('green');
	let icon = $state<CategoryIconKey>('tag');
	let kind = $state('outcome');
	let glyphOpen = $state(false);
	let busy = $state(false);
	let error = $state('');

	// Every time it opens it starts blank, with the kind of the movement being entered.
	$effect(() => {
		if (!open) return;
		untrack(() => {
			name = '';
			color = 'green';
			icon = 'tag';
			kind = defaultKind;
			glyphOpen = false;
			error = '';
		});
	});
</script>

<BottomDrawer title="Nueva categoría" nested bind:open>
	<form
		method="POST"
		action={resolve('/categories/new')}
		class="form"
		novalidate
		use:enhance={() => {
			busy = true;
			error = '';
			return async ({ result }) => {
				busy = false;
				if (result.type === 'redirect') {
					const id = result.location.split('/').pop()!;
					const picked = CATEGORY_ICONS.find((i) => i.key === icon)?.key ?? 'tag';
					oncreated({
						id,
						name: name.trim(),
						icon: picked,
						color,
						kind: kind === 'income' || kind === 'outcome' ? kind : null
					});
					open = false;
				} else if (result.type === 'failure') {
					const errors = (result.data?.errors ?? {}) as Record<string, string>;
					error = Object.values(errors)[0] ?? 'No se pudo crear la categoría.';
				} else error = 'No se pudo crear la categoría.';
			};
		}}
	>
		<div class="head">
			<button
				type="button"
				class="glyph"
				aria-label="Ícono y color"
				aria-expanded={glyphOpen}
				onclick={() => (glyphOpen = !glyphOpen)}
			>
				<IconBadge {icon} {color} size="2.75rem" />
			</button>
			<Input
				name="name"
				aria-label="Nombre"
				placeholder="Nombre"
				autocomplete="off"
				maxlength={NAME_MAX_LENGTH}
				aria-invalid={error ? 'true' : undefined}
				aria-describedby={error ? 'category-create-error' : undefined}
				class="h-11 flex-1"
				bind:value={name}
			/>
		</div>
		{#if error}<p class="error" id="category-create-error" role="alert">{error}</p>{/if}

		{#if glyphOpen}
			<ul class="card">
				<li>
					<IconPicker
						name="picker-icon"
						legend="Ícono"
						options={CATEGORY_ICONS}
						bind:value={icon}
						{color}
					/>
				</li>
				<li><ColorPicker name="picker-color" legend="Color" bind:value={color} /></li>
			</ul>
		{/if}
		<input type="hidden" name="icon" value={icon} />
		<input type="hidden" name="color" value={color} />

		<div class="kind">
			<span id="category-kind-label" class="label">Se usa para</span>
			<SegmentedControl
				name="kind"
				options={kindOptions}
				bind:value={kind}
				labelledby="category-kind-label"
			/>
		</div>

		<div class="actions">
			<Button
				type="button"
				variant="outline"
				class="h-auto min-h-11 min-w-0 flex-1 basis-0"
				onclick={() => (open = false)}>Cancelar</Button
			>
			<Button
				type="submit"
				class="h-auto min-h-11 min-w-0 flex-1 basis-0"
				disabled={!name.trim() || busy}>Guardar</Button
			>
		</div>
	</form>
</BottomDrawer>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.head {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.glyph {
		flex: none;
		display: grid;
		place-items: center;
		min-width: var(--tap-target);
		min-height: var(--tap-target);
		padding: 0;
		border: 0;
		background: transparent;
	}

	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.kind {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.label {
		font-size: var(--font-size-base);
		color: var(--text);
	}

	.actions {
		display: flex;
		gap: var(--space-3);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
