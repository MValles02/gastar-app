<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import { KIND_OPTIONS } from '#lib/movement.ts';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import DetailRow from '#lib/components/DetailRow.svelte';

	/**
	 * A category's "Se usa para" row and its drawer: `kind` ('' for both); a kind in `disabled` can't be
	 * picked; `save` stores a pick and returns its error, if any.
	 */
	let {
		kind,
		disabled,
		save
	}: {
		kind: string;
		disabled: readonly string[];
		save: (kind: string) => Promise<string | null>;
	} = $props();

	const KIND_HINT: Record<string, string> = {
		outcome: 'Solo aparece al registrar gastos.',
		income: 'Solo aparece al registrar ingresos.',
		'': 'Aparece al registrar gastos e ingresos.'
	};
	const KINDS = [...KIND_OPTIONS, { value: '', label: 'Ambos' }].map((k) => ({
		...k,
		hint: KIND_HINT[k.value]
	}));
	const kindLabel = $derived(KINDS.find((k) => k.value === kind)?.label);

	let open = $state(false);
	let error = $state('');
</script>

<DetailRow label="Se usa para" onclick={() => (open = true)} {error}>{kindLabel}</DetailRow>

<BottomDrawer title="Se usa para" bind:open>
	<ul class="kinds">
		{#each KINDS as k (k.value)}
			{@const blocked = disabled.some((d) => d === k.value)}
			<li>
				<button
					type="button"
					class="kind"
					aria-pressed={k.value === kind}
					disabled={blocked}
					onclick={async () => {
						open = false;
						error = (await save(k.value)) ?? '';
					}}
				>
					<span class="text">
						<span class="title">{k.label}</span>
						<span class="hint">{k.hint}</span>
					</span>
					{#if k.value === kind}<Check size={20} strokeWidth={1.75} aria-hidden="true" />{/if}
				</button>
			</li>
		{/each}
	</ul>
</BottomDrawer>

<style>
	.kinds {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.kind {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		width: 100%;
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-4);
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.kind:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.text {
		display: flex;
		flex-direction: column;
	}

	.hint {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}
</style>
