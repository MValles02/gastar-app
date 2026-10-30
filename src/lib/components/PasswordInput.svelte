<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from '$lib/components/Icon.svelte';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';

	// `#password` / `name="password"` input with a show/hide toggle; the page renders the label.
	let {
		value = $bindable(''),
		autocomplete,
		invalid = false,
		describedby,
		minlength
	}: {
		value?: string;
		autocomplete: HTMLInputAttributes['autocomplete'];
		invalid?: boolean;
		describedby?: string;
		minlength?: number;
	} = $props();

	let showPassword = $state(false);
</script>

<InputGroup.Root>
	<InputGroup.Input
		id="password"
		type={showPassword ? 'text' : 'password'}
		name="password"
		{autocomplete}
		bind:value
		required
		{minlength}
		aria-invalid={invalid ? true : undefined}
		aria-describedby={describedby}
	/>
	<InputGroup.Addon align="inline-end">
		<InputGroup.Button
			size="icon-xs"
			class="relative after:absolute after:inset-[calc(50%-1.4rem)]"
			aria-pressed={showPassword}
			onclick={() => (showPassword = !showPassword)}
		>
			<Icon name={showPassword ? 'eye-off' : 'eye'} size="1.25rem" />
			<span class="visually-hidden">
				{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
			</span>
		</InputGroup.Button>
	</InputGroup.Addon>
</InputGroup.Root>
