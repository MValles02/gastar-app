<script lang="ts">
	import { Switch } from '#lib/components/ui/switch/index.js';

	/** On/off switch posting `value` under `name` when on; its label is the caller's (`Row labelFor={id}`). */
	let {
		id,
		name,
		checked = $bindable(false),
		value = 'on',
		describedby,
		disabled = false
	}: {
		id: string;
		name: string;
		checked?: boolean;
		value?: string;
		describedby?: string;
		disabled?: boolean;
	} = $props();
</script>

<Switch {id} {name} {value} {disabled} bind:checked aria-describedby={describedby} />
