<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';

	let {
		title,
		open = $bindable(false),
		onclose,
		children
	}: { title: string; open?: boolean; onclose?: () => void; children: Snippet } = $props();

	let dialog: HTMLDialogElement | null = $state(null);
	const titleId = $props.id();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	aria-labelledby={titleId}
	onclick={(e) => {
		if (e.target === dialog) open = false;
	}}
	onclose={() => {
		open = false;
		onclose?.();
	}}
>
	<div class="content">
		<header>
			<h2 id={titleId}>{title}</h2>
			<Button type="button" variant="secondary" onclick={() => (open = false)}>Cerrar</Button>
		</header>
		{@render children()}
	</div>
</dialog>

<style>
	dialog {
		width: 100%;
		max-width: min(35rem, 100%);
		max-height: 85dvh;
		margin: auto auto 0;
		padding: 0;
		overflow-y: auto;
		background: var(--surface-raised);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: var(--radius) var(--radius) 0 0;
	}

	dialog::backdrop {
		background: color-mix(in srgb, var(--text) 40%, transparent);
	}

	.content {
		padding: var(--space-5) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom));
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	h2 {
		font-size: var(--font-size-lg);
	}
</style>
