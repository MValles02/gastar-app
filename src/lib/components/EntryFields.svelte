<script lang="ts">
	import type { Snippet } from 'svelte';
	import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';

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
		<p class="error" id="{descriptionId}-error" role="alert">{descriptionError}</p>
	{/if}
</div>

<ul class="card" class:outline-errors={outlineErrors}>
	{@render account()}
	{#if category}{@render category()}{/if}
	{@render when()}
</ul>

{#if extra}
	<ul class="card">{@render extra()}</ul>
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
		border-radius: 12px;
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

	.card > :global(li.bad) {
		box-shadow: inset 3px 0 0 var(--negative);
	}

	.card.outline-errors > :global(li.bad) {
		box-shadow: inset 0 0 0 1.5px var(--negative);
	}
</style>
