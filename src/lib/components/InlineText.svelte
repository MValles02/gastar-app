<script lang="ts">
	import { tick, untrack, type Snippet } from 'svelte';

	/**
	 * A value shown as text that turns into an input when tapped. Enter or blur saves through `onsave`
	 * (an unchanged value does not), Escape cancels. `onsave` returns an error message, or null when
	 * saved; on an error the old value stays and the message shows below. Font, colour and alignment
	 * come from the parent.
	 */
	let {
		value,
		label,
		inputmode = 'text',
		prefix,
		maxlength,
		open = false,
		required = false,
		display,
		invalid,
		onsave
	}: {
		/** Starts in edit mode, focused. */
		open?: boolean;
		required?: boolean;
		/** The saved value, as it is edited. */
		value: string;
		/** Accessible name: the trigger reads "<label>: <value>", the input "<label>". */
		label: string;
		inputmode?: 'text' | 'decimal' | 'numeric';
		/** Muted text before the input while editing (e.g. "1 USD = $"). */
		prefix?: string;
		maxlength?: number;
		/** How the value reads when not editing. */
		display: Snippet;
		/** `id` of an error shown by the parent: marks the value invalid and described by it. */
		invalid?: string;
		onsave: (next: string) => Promise<string | null>;
	} = $props();

	let editing = $state(untrack(() => open));
	let draft = $state(untrack(() => (open ? value : '')));
	let error = $state('');
	let input: HTMLInputElement | null = $state(null);
	const errorId = $props.id();

	async function start() {
		draft = value;
		error = '';
		editing = true;
		await tick();
		input?.focus();
		input?.select();
	}

	async function commit() {
		if (!editing) return;
		if (required && draft.trim() === '') return;
		editing = false;
		if (draft !== value) error = (await onsave(draft)) ?? '';
	}
</script>

<div class="inline">
	{#if editing}
		<span class="edit">
			{#if prefix}<span class="prefix">{prefix}</span>{/if}
			<input
				bind:this={input}
				bind:value={draft}
				{inputmode}
				{maxlength}
				{required}
				{@attach (n) => n.focus()}
				aria-label={label}
				aria-invalid={invalid ? 'true' : undefined}
				aria-describedby={invalid}
				autocomplete="off"
				onblur={commit}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						void commit();
					} else if (e.key === 'Escape') {
						e.stopPropagation();
						editing = false;
					}
				}}
			/>
		</span>
	{:else}
		<button
			type="button"
			class="trigger"
			aria-label="{label}: {value}"
			aria-describedby={error ? errorId : invalid}
			onclick={start}
		>
			{@render display()}
		</button>
	{/if}
	{#if error}<p class="error" id={errorId} role="alert">{error}</p>{/if}
</div>

<style>
	.inline {
		min-width: 0;
		max-width: 100%;
	}

	.trigger,
	input {
		max-width: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		letter-spacing: inherit;
		text-align: inherit;
	}

	.trigger {
		min-height: var(--tap-target);
		cursor: text;
		overflow-wrap: anywhere;
	}

	.edit {
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-1);
		max-width: 100%;
		min-height: var(--tap-target);
		border-bottom: 2px solid var(--primary);
	}

	.prefix {
		color: var(--text-muted);
	}

	input {
		min-width: 2ch;
		field-sizing: content;
		/* Inherited size, but never under 16px: iOS zooms the page on smaller inputs. */
		font-size: max(1em, var(--font-size-input));
		outline: none;
		caret-color: var(--primary);
	}

	.error {
		margin-top: var(--space-1);
		color: var(--negative);
		font-size: var(--font-size-sm);
		font-weight: 400;
		text-align: inherit;
	}
</style>
