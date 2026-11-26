<script lang="ts">
	import { KIND_OPTIONS } from '#lib/movement.ts';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import DetailRow from '#lib/components/DetailRow.svelte';
	import OptionList from '#lib/components/pickers/OptionList.svelte';

	/**
	 * A category's "Se usa para" row and its sheet (the picker list, opened from a detail row): `kind`
	 * ('' for both); a kind in `disabled` can't be picked; `save` stores a pick and returns its error.
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
	<OptionList
		items={KINDS}
		key={(k) => k.value}
		title={(k) => k.label}
		description={(k) => k.hint}
		disabled={(k) => disabled.some((d) => d === k.value)}
		on={(k) => k.value === kind}
		onpick={async (k) => {
			open = false;
			error = (await save(k.value)) ?? '';
		}}
	/>
</BottomDrawer>
