<script lang="ts">
	import type { Snippet } from 'svelte';
	import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
	import TextRow from '$lib/components/TextRow.svelte';

	/**
	 * The field card shared by the movement and recurring forms, in a fixed order: description, account,
	 * category, when, extra. The snippets emit their own `<li>`.
	 */
	let {
		description = $bindable(),
		descriptionId,
		descriptionError,
		account,
		category,
		when,
		extra,
		outlineErrors = false
	}: {
		description: string;
		descriptionId: string;
		descriptionError?: string;
		account: Snippet;
		category?: Snippet;
		when: Snippet;
		extra?: Snippet;
		/** A row with an error gets a full red border instead of the left bar. */
		outlineErrors?: boolean;
	} = $props();
</script>

<ul class="card" class:outline-errors={outlineErrors}>
	<li class:bad={descriptionError}>
		<TextRow
			id={descriptionId}
			name="description"
			label="Descripción"
			bind:value={description}
			placeholder="Agregar"
			maxlength={DESCRIPTION_MAX_LENGTH}
			required
			error={descriptionError}
			errorId="{descriptionId}-error"
		/>
	</li>
	{@render account()}
	{#if category}{@render category()}{/if}
	{@render when()}
	{#if extra}{@render extra()}{/if}
</ul>

<style>
	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.card > :global(li.bad),
	.card > li.bad {
		box-shadow: inset 3px 0 0 var(--negative);
	}

	.card.outline-errors > :global(li.bad),
	.card.outline-errors > li.bad {
		box-shadow: inset 0 0 0 1.5px var(--negative);
	}
</style>
