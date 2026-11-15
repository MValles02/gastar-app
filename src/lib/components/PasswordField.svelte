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
		errorId = 'password-error',
		minlength
	}: {
		value?: string;
		autocomplete: HTMLInputAttributes['autocomplete'];
		error?: string;
		hint?: string;
		/** Signup gives its error the hint's id, so the input's aria-describedby never changes. */
		errorId?: string;
		minlength?: number;
	} = $props();
</script>

<Field.Field>
	<Field.Label for="password">Contraseña</Field.Label>
	<PasswordInput
		bind:value
		{autocomplete}
		{minlength}
		invalid={!!error}
		describedby={error ? errorId : hint ? 'password-hint' : undefined}
	/>
	{#if error}
		<Field.Error id={errorId}>{error}</Field.Error>
	{:else if hint}
		<Field.Description id="password-hint">{hint}</Field.Description>
	{/if}
</Field.Field>
