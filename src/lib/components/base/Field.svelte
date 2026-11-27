<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from '#lib/components/Icon.svelte';
	import { groupedAmount } from '#lib/amount-input.ts';
	import { es } from '#lib/copy/es.ts';
	import { appear } from '#lib/motion.ts';

	/**
	 * Labelled text input. `stacked`: the label above a pill capsule (forms, signed-out pages; a
	 * `password` type adds the show/hide button). `row`: a card row, label at the left and the value
	 * right-aligned (sits inside the caller's `<li>`). Under the field: the error, else the hint, both
	 * on `errorId` so the input's `aria-describedby` never changes when an error appears.
	 */
	let {
		id,
		name,
		label,
		value = $bindable(''),
		type = 'text',
		layout = 'stacked',
		amount = false,
		prefix,
		end,
		error,
		errorId = `${id}-error`,
		hint,
		describedby,
		invalid = false,
		autocomplete,
		autocapitalize,
		inputmode,
		placeholder,
		maxlength,
		minlength,
		required = false,
		form
	}: {
		id: string;
		name: string;
		label: string;
		value?: string;
		type?: 'text' | 'email' | 'password';
		layout?: 'stacked' | 'row';
		/** Group thousands as the user types (whole-pesos / decimal amounts). */
		amount?: boolean;
		/** Muted text before the input (e.g. the currency symbol), so an empty row reads "$ 0". */
		prefix?: string;
		/** Content after the input, inside the row (sibling of the label). */
		end?: Snippet;
		error?: string;
		errorId?: string;
		hint?: string;
		/** Extra id(s) for `aria-describedby`, after the error/hint id. */
		describedby?: string;
		/** `aria-invalid` without an error message of its own. */
		invalid?: boolean;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		autocapitalize?: HTMLInputAttributes['autocapitalize'];
		inputmode?: HTMLInputAttributes['inputmode'];
		placeholder?: string;
		maxlength?: number;
		minlength?: number;
		required?: boolean;
		/** `id` of a `<form>` elsewhere in the page this input submits with. */
		form?: string;
	} = $props();

	let reveal = $state(false);

	const row = $derived(layout === 'row');
	const kind = $derived(type === 'password' && reveal ? 'text' : type);
	const described = $derived(
		[error || hint ? errorId : '', describedby].filter(Boolean).join(' ') || undefined
	);
	const bad = $derived(error || invalid ? ('true' as const) : undefined);
</script>

{#snippet message()}
	{#if error}
		<p class="msg error" id={errorId} role="alert" in:appear>{error}</p>
	{:else if hint}
		<p class="msg" id={errorId}>{hint}</p>
	{/if}
{/snippet}

{#if row}
	<div class="wrap">
		<div class="row">
			<label class="lbl" class:has-prefix={!!prefix} for={id}>
				<span class="k">{label}</span>
				{#if prefix}<span class="prefix">{prefix}</span>{/if}
				<input
					{id}
					{name}
					{form}
					type="text"
					{maxlength}
					{minlength}
					{inputmode}
					{required}
					{placeholder}
					autocomplete={autocomplete ?? 'off'}
					{autocapitalize}
					bind:value
					{@attach (node) => (amount ? groupedAmount(node) : undefined)}
					aria-invalid={bad}
					aria-describedby={described}
				/>
			</label>
			{#if end}{@render end()}{/if}
		</div>
		{@render message()}
	</div>
{:else}
	<div class="field">
		<label class="label" for={id}>{label}</label>
		<div class="capsule">
			<input
				{id}
				{name}
				{form}
				type={kind}
				{maxlength}
				{minlength}
				{inputmode}
				{required}
				{placeholder}
				{autocomplete}
				{autocapitalize}
				bind:value
				aria-invalid={bad}
				aria-describedby={described}
			/>
			{#if type === 'password'}
				<button
					type="button"
					class="reveal"
					aria-pressed={reveal}
					onclick={() => (reveal = !reveal)}
				>
					<Icon name={reveal ? 'eye-off' : 'eye'} size="sm" />
					<span class="visually-hidden">
						{reveal ? es.ui.hidePassword : es.ui.showPassword}
					</span>
				</button>
			{/if}
		</div>
		{@render message()}
	</div>
{/if}

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.label {
		font-size: var(--font-size-sm);
		font-weight: 500;
		line-height: 1.3;
	}

	.capsule {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		height: var(--size-field);
		padding-inline: var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		background: var(--surface);
	}

	.capsule:focus-within {
		border-color: var(--ring);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
	}

	.capsule:has(input[aria-invalid='true']) {
		border-color: var(--negative);
	}

	.capsule input {
		flex: 1;
		min-width: 0;
		height: 100%;
		padding: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--text);
		font-size: var(--font-size-input);
	}

	.capsule input::placeholder {
		color: var(--text-muted);
	}

	/* The icon is small; the ::after grows the hit area to the tap target. */
	.reveal {
		position: relative;
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: var(--size-pill);
		height: var(--size-pill);
		padding: 0;
		border: 0;
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
	}

	.reveal::after {
		content: '';
		position: absolute;
		inset: calc((var(--size-pill) - var(--tap-target)) / 2);
	}

	.reveal:focus-visible {
		outline: 2px solid var(--ring);
	}

	.msg {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.msg.error {
		color: var(--negative);
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: 0 var(--space-4);
	}

	.lbl {
		display: flex;
		flex: 1 1 0;
		min-width: 0;
		flex-direction: row;
		align-items: center;
		gap: var(--space-3);
		min-height: 3.5rem;
		font-size: var(--font-size-base);
		color: var(--text);
		cursor: text;
	}

	.prefix {
		flex: none;
		margin-inline-start: auto;
		margin-inline-end: calc(var(--space-3) * -1 + 0.25rem);
		color: var(--text-muted);
	}

	.has-prefix input {
		flex: 0 1 auto;
		field-sizing: content;
		min-width: 1ch;
	}

	.k {
		flex: none;
	}

	.lbl input {
		flex: 1 1 4rem;
		min-width: 0;
		width: auto;
		min-height: 3.5rem;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		text-align: right;
		scroll-margin-bottom: 6rem;
	}

	.lbl input::placeholder {
		color: var(--text-muted);
		opacity: 1;
	}

	.lbl input:focus-visible {
		outline-offset: -2px;
		/* The ring follows the card's rounding instead of a square box. */
		border-radius: var(--radius-sm);
	}

	.wrap .msg {
		padding: 0 var(--space-4) var(--space-3);
	}
</style>
