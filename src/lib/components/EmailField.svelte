<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';

	// Labelled `#email` field of the signed-out pages.
	let {
		value = $bindable(''),
		autocomplete = 'username',
		error,
		ariaWiring = true,
		describedby
	}: {
		value?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		error?: string;
		/** false (login): no error under the field and no aria-invalid; aria-describedby only comes from `describedby`. */
		ariaWiring?: boolean;
		/**
		 * Only used when ariaWiring is false: id of a shared error element this input points to. It does not
		 * mark the field invalid, so the form's focus-first-invalid keeps landing on the field that owns the error.
		 */
		describedby?: string;
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
		aria-describedby={shownError ? 'email-error' : ariaWiring ? undefined : describedby}
	/>{#if ariaWiring}
		<!-- eslint-disable-next-line svelte/no-useless-mustaches -- a plain space is trimmed at block start; it keeps the whitespace node the pages had before the error slot (login had none) -->
		{' '}{#if shownError}
			<Field.Error id="email-error">{shownError}</Field.Error>
		{/if}
	{/if}
</Field.Field>
