<script lang="ts">
	import { appear } from '#lib/motion.ts';
	import type { Snippet } from 'svelte';
	import { DESCRIPTION_MAX_LENGTH } from '#lib/fields.ts';
	import DetailCard from './DetailCard.svelte';

	/**
	 * The fields shared by the movement and recurring forms: a labelled Descripción input, then one card
	 * with account, category and when, then `extra` in a card of its own. The snippets emit their own `<li>`.
	 */
	let {
		description = $bindable(),
		descriptionId,
		descriptionError,
		placeholder,
		account,
		category,
		when,
		extra,
		outlineErrors = false
	}: {
		description: string;
		descriptionId: string;
		descriptionError?: string;
		placeholder?: string;
		account: Snippet;
		category?: Snippet;
		when: Snippet;
		extra?: Snippet;
		/** A row with an error gets a full red border instead of the left bar. */
		outlineErrors?: boolean;
	} = $props();
</script>

<div class="text-field">
	<label for={descriptionId}>Descripción</label>
	<input
		id={descriptionId}
		name="description"
		type="text"
		autocomplete="off"
		maxlength={DESCRIPTION_MAX_LENGTH}
		required
		{placeholder}
		bind:value={description}
		aria-invalid={descriptionError ? 'true' : undefined}
		aria-describedby={descriptionError ? `${descriptionId}-error` : undefined}
	/>
	{#if descriptionError}
		<p class="error" id="{descriptionId}-error" role="alert" in:appear>{descriptionError}</p>
	{/if}
</div>

<DetailCard {outlineErrors}>
	{@render account()}
	{#if category}{@render category()}{/if}
	{@render when()}
</DetailCard>

{#if extra}
	<DetailCard>{@render extra()}</DetailCard>
{/if}

<style>
	.text-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.text-field label {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.text-field input {
		width: 100%;
		height: 50px;
		padding: 0 var(--space-4);
		border: 1px solid var(--input);
		border-radius: var(--radius);
		background: transparent;
		color: var(--text);
		font-size: 16px;
	}

	.text-field input::placeholder {
		color: var(--text-muted);
	}

	.text-field input[aria-invalid='true'] {
		border-color: var(--negative);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
