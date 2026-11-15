<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';

	// Labelled `#email` field of the signed-out pages.
	let {
		value = $bindable(''),
		autocomplete = 'username',
		error,
		ariaWiring = true
	}: {
		value?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		error?: string;
		/** false (login): no aria-invalid/aria-describedby and no error under the field. */
		ariaWiring?: boolean;
	} = $props();

	const shownError = $derived(ariaWiring ? error : undefined);
</script>

<Field.Field>
	<Field.Label for="email">Email</Field.Label>
	<Input
		id="email"
		type="email"
		name="email"
		{autocomplete}
		autocapitalize="none"
		bind:value
		required
		aria-invalid={shownError ? true : undefined}
		aria-describedby={shownError ? 'email-error' : undefined}
	/>{#if ariaWiring}
		<!-- eslint-disable-next-line svelte/no-useless-mustaches -- a plain space is trimmed at block start; it keeps the whitespace node the pages had before the error slot (login had none) -->
		{' '}{#if shownError}
			<Field.Error id="email-error">{shownError}</Field.Error>
		{/if}
	{/if}
</Field.Field>
