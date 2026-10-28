<script lang="ts">
	import * as Field from '$lib/components/ui/field/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';

	/** Form row: label on the left, switch at the end. Posts `name=value` when on. */
	let {
		id,
		name,
		label,
		checked = $bindable(false),
		value = 'on',
		describedby
	}: {
		id: string;
		name: string;
		label: string;
		checked?: boolean;
		value?: string;
		describedby?: string;
	} = $props();
</script>

<Field.Field orientation="horizontal" class="min-h-14 px-4">
	<Field.Label for={id} class="flex-1">{label}</Field.Label>
	<Switch {id} {name} {value} bind:checked aria-describedby={describedby} />
</Field.Field>
