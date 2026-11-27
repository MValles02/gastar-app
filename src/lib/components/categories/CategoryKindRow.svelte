<script lang="ts">
	import { KIND_OPTIONS } from '#lib/movement.ts';
	import Sheet from '#lib/components/base/Sheet.svelte';
	import { es } from '#lib/copy/es.ts';
	import Row from '#lib/components/base/Row.svelte';
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
		outcome: es.categories.kind.hint.outcome,
		income: es.categories.kind.hint.income,
		'': es.categories.kind.hint.both
	};
	const KINDS = [...KIND_OPTIONS, { value: '', label: es.categories.kind.both }].map((k) => ({
		...k,
		hint: KIND_HINT[k.value]
	}));
	const kindLabel = $derived(KINDS.find((k) => k.value === kind)?.label);

	let open = $state(false);
	let error = $state('');
</script>

{#snippet trailing()}{kindLabel}{/snippet}

<Row
	title={es.categories.kind.title}
	onclick={() => (open = true)}
	haspopup
	chevron
	{error}
	{trailing}
/>

<Sheet title={es.categories.kind.title} bind:open>
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
</Sheet>
