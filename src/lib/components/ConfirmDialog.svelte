<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import Button from './Button.svelte';

	let {
		triggerLabel,
		triggerVariant = 'secondary',
		title,
		confirmLabel,
		action,
		children
	}: {
		triggerLabel: string;
		triggerVariant?: 'primary' | 'secondary';
		title: string;
		confirmLabel: string;
		action: string;
		children?: Snippet;
	} = $props();

	let dialog: HTMLDialogElement | null = $state(null);
	const titleId = $props.id();
	let mounted = $state(false);
	onMount(() => (mounted = true));
</script>

{#if mounted}
	<Button type="button" variant={triggerVariant} onclick={() => dialog?.showModal()}>
		{triggerLabel}
	</Button>

	<dialog bind:this={dialog} aria-labelledby={titleId}>
		<h2 id={titleId}>{title}</h2>
		{#if children}<div class="body">{@render children()}</div>{/if}
		<form
			method="POST"
			{action}
			use:enhance={() =>
				async ({ result, update }) => {
					if (result.type !== 'failure' && result.type !== 'error') dialog?.close();
					await update();
				}}
		>
			<Button type="button" variant="secondary" onclick={() => dialog?.close()}>Cancelar</Button>
			<Button type="submit">{confirmLabel}</Button>
		</form>
	</dialog>
{:else}
	<!-- No-JS fallback: a plain details/summary confirm step that posts the same action. -->
	<details class="fallback">
		<summary>{triggerLabel}</summary>
		<p class="title">{title}</p>
		{#if children}<div class="body">{@render children()}</div>{/if}
		<form method="POST" {action}>
			<Button type="submit">{confirmLabel}</Button>
		</form>
	</details>
{/if}

<style>
	dialog {
		width: min(calc(100% - 2 * var(--space-5)), 22rem);
		margin: auto;
		padding: var(--space-5);
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	dialog::backdrop {
		background: color-mix(in srgb, var(--text) 40%, transparent);
	}

	.fallback summary {
		cursor: pointer;
		font-weight: 600;
	}

	.title {
		margin-top: var(--space-3);
		font-weight: 600;
	}

	h2 {
		font-size: var(--font-size-lg);
	}

	.body {
		margin-top: var(--space-3);
		color: var(--text-muted);
	}

	form {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-5);
	}
</style>
