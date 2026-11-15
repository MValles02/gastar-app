<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { followRedirect } from '#lib/nav-stack.svelte.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';

	let {
		triggerLabel,
		triggerVariant = 'outline',
		title,
		confirmLabel,
		confirmVariant = 'destructive',
		action,
		formId,
		closeOnFailure = false,
		ondone,
		triggerClass,
		children
	}: {
		triggerLabel: string;
		triggerVariant?: 'default' | 'outline' | 'destructive';
		title: string;
		confirmLabel: string;
		confirmVariant?: 'default' | 'destructive';
		action: string;
		/** `id` of the confirm form, so inputs elsewhere on the page can join it with `form=`. */
		formId?: string;
		/** Close the dialog on a failed action too, so the page behind shows its error. */
		closeOnFailure?: boolean;
		/** Gets the result type instead of following its redirect (e.g. a drawer that closes itself). */
		ondone?: (type: string) => unknown;
		/** Extra classes for the trigger button (and the no-JS summary). */
		triggerClass?: string;
		children?: Snippet;
	} = $props();

	let open = $state(false);
	let mounted = $state(false);
	onMount(() => (mounted = true));
</script>

{#if mounted}
	<AlertDialog.Root bind:open>
		<AlertDialog.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant={triggerVariant} class={triggerClass}>{triggerLabel}</Button>
			{/snippet}
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>{title}</AlertDialog.Title>
				{#if children}
					<AlertDialog.Description>{@render children()}</AlertDialog.Description>
				{/if}
			</AlertDialog.Header>
			<form
				id={formId}
				method="POST"
				{action}
				use:enhance={() => async (input) => {
					const { type } = input.result;
					if (closeOnFailure || (type !== 'failure' && type !== 'error')) open = false;
					if (ondone) await ondone(type);
					else await followRedirect(input);
				}}
			>
				<AlertDialog.Footer>
					<AlertDialog.Cancel type="button">Cancelar</AlertDialog.Cancel>
					<AlertDialog.Action type="submit" variant={confirmVariant}
						>{confirmLabel}</AlertDialog.Action
					>
				</AlertDialog.Footer>
			</form>
		</AlertDialog.Content>
	</AlertDialog.Root>
{:else}
	<!-- No-JS fallback: a plain details/summary confirm step that posts the same action. -->
	<details class="fallback">
		<summary class={triggerClass}>{triggerLabel}</summary>
		<p class="title">{title}</p>
		{#if children}<div class="body">{@render children()}</div>{/if}
		<form id={formId} method="POST" {action}>
			<Button type="submit" variant={confirmVariant === 'destructive' ? 'danger' : confirmVariant}
				>{confirmLabel}</Button
			>
		</form>
	</details>
{/if}

<style>
	.fallback summary {
		cursor: pointer;
		font-weight: 600;
	}

	.title {
		margin-top: var(--space-3);
		font-weight: 600;
	}

	.body {
		margin-top: var(--space-3);
		color: var(--text-muted);
	}

	.fallback form {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-5);
	}
</style>
