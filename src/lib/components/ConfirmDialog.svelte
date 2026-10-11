<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

	let {
		triggerLabel,
		triggerVariant = 'outline',
		title,
		confirmLabel,
		action,
		children
	}: {
		triggerLabel: string;
		triggerVariant?: 'default' | 'outline' | 'destructive';
		title: string;
		confirmLabel: string;
		action: string;
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
				<Button {...props} variant={triggerVariant}>{triggerLabel}</Button>
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
				method="POST"
				{action}
				use:enhance={() =>
					async ({ result, update }) => {
						if (result.type !== 'failure' && result.type !== 'error') open = false;
						await update();
					}}
			>
				<AlertDialog.Footer>
					<AlertDialog.Cancel type="button">Cancelar</AlertDialog.Cancel>
					<AlertDialog.Action type="submit">{confirmLabel}</AlertDialog.Action>
				</AlertDialog.Footer>
			</form>
		</AlertDialog.Content>
	</AlertDialog.Root>
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

	form {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-5);
	}
</style>
