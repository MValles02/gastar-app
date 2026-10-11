<script lang="ts">
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';

	// Auth page form: progressive enhancement, busy state, and focus on the first invalid
	// field after a failed submit. Children are the fields; the submit button comes last.
	let {
		action,
		submitLabel,
		onupdated,
		children
	}: {
		action: string;
		submitLabel: string;
		/** Runs after each submit result is applied (e.g. to clear a password). */
		onupdated?: () => void;
		children: Snippet;
	} = $props();

	let busy = $state(false);
	let formEl: HTMLFormElement | undefined = $state();
</script>

<form
	bind:this={formEl}
	method="POST"
	{action}
	novalidate
	class="form"
	class:busy
	aria-busy={busy}
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update({ reset: false });
			busy = false;
			onupdated?.();
			await tick();
			formEl?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
		};
	}}
>
	{@render children()}

	<Button type="submit" class="mt-2 w-full" disabled={busy}>{submitLabel}</Button>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form.busy {
		opacity: 0.55;
	}
</style>
