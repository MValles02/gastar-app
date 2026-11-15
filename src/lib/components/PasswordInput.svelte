<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from '#lib/components/Icon.svelte';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';

	// `#password` / `name="password"` input with a show/hide toggle; the page renders the label.
	let {
		value = $bindable(''),
		autocomplete,
		invalid = false,
		describedby,
		minlength,
		maxlength,
		id = 'password',
		name = 'password',
		required = true,
		outlined = false
	}: {
		value?: string;
		autocomplete: HTMLInputAttributes['autocomplete'];
		invalid?: boolean;
		describedby?: string;
		minlength?: number;
		maxlength?: number;
		id?: string;
		name?: string;
		required?: boolean;
		/** Drawer look: a 50px outlined box, 12px radius, 16px text. */
		outlined?: boolean;
	} = $props();

	let showPassword = $state(false);
</script>

<InputGroup.Root class={outlined ? 'h-[50px] rounded-xl' : undefined}>
	<InputGroup.Input
		{id}
		type={showPassword ? 'text' : 'password'}
		{name}
		{autocomplete}
		bind:value
		{required}
		{minlength}
		{maxlength}
		class={outlined ? 'h-full px-3.5 text-base' : undefined}
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
