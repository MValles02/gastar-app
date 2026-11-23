<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import * as Field from '#lib/components/ui/field/index.js';
	import PasswordInput from '#lib/components/PasswordInput.svelte';

	// Labelled `#password` field of the signed-out pages: error, else the optional hint, under it.
	let {
		value = $bindable(''),
		autocomplete,
		error,
		hint,
		minlength
	}: {
		value?: string;
		autocomplete: HTMLInputAttributes['autocomplete'];
		error?: string;
		hint?: string;
		minlength?: number;
	} = $props();

	// The hint and the error share one id, so the input's aria-describedby never changes when an error
	// appears. The login page's EmailField points at this id too.
	const errorId = 'password-error';
</script>

<Field.Field>
	<Field.Label for="password">Contraseña</Field.Label>
	<PasswordInput
		bind:value
		{autocomplete}
		{minlength}
		invalid={!!error}
		describedby={error || hint ? errorId : undefined}
	/>
	{#if error}
		<Field.Error id={errorId}>{error}</Field.Error>
	{:else if hint}
		<Field.Description id={errorId}>{hint}</Field.Description>
	{/if}
</Field.Field>
