<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { Button } from '#lib/components/ui/button/index.js';

	// The page of one OAuth link (Gmail, Mercado Pago): notices, the intro / reconnect / linked states and
	// Desvincular. The provider's own copy comes in as snippets.
	let {
		name,
		data,
		introTitle,
		intro,
		reconnect,
		linkedTitle,
		linked,
		children,
		disconnectNote
	}: {
		/** The provider as the copy names it: "Gmail", "Mercado Pago". */
		name: string;
		data: { flash: string | null; linked: boolean; connection: { needsReconnect: boolean } | null };
		introTitle: string;
		intro: Snippet;
		reconnect: Snippet;
		/** When set, the linked state is a card with this heading around `linked`. */
		linkedTitle?: string;
		linked: Snippet;
		/** Below the state, whether linked or not. */
		children?: Snippet;
		disconnectNote: Snippet;
	} = $props();
</script>

<svelte:head>
	<title>{name} · Gastar</title>
</svelte:head>

<PageHeader
	title={name}
	back={{
		href: resolve('profile/vinculaciones'),
		label: 'Volver a Vinculaciones',
		text: 'Vinculaciones'
	}}
/>

<div class="page">
	{#if data.flash}<p class="flash bad" role="alert">{data.flash}</p>{/if}
	{#if data.linked}<p class="flash" role="status">{name} vinculado.</p>{/if}

	{#if !data.connection}
		<section class="card" aria-labelledby="intro">
			<h2 id="intro">{introTitle}</h2>
			{@render intro()}
			<form method="POST" action="?/connect">
				<Button type="submit" class="w-full">Vincular {name}</Button>
			</form>
		</section>
	{:else if data.connection.needsReconnect}
		<section class="card" aria-labelledby="intro">
			<h2 id="intro">Hay que volver a vincular</h2>
			{@render reconnect()}
			<form method="POST" action="?/connect">
				<Button type="submit" class="w-full">Reconectar</Button>
			</form>
		</section>
	{:else if linkedTitle}
		<section class="card" aria-labelledby="intro">
			<h2 id="intro">{linkedTitle}</h2>
			{@render linked()}
		</section>
	{:else}
		{@render linked()}
	{/if}

	{@render children?.()}

	{#if data.connection}
		<ConfirmDialog
			triggerLabel="Desvincular"
			triggerClass="w-full"
			title="¿Desvincular {name}?"
			confirmLabel="Desvincular"
			action="?/disconnect"
		>
			{@render disconnectNote()}
		</ConfirmDialog>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-top: var(--space-1);
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-5) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.card h2 {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	/* The paragraphs come from the provider's snippets, so they carry the page's scope, not this one's. */
	.card :global(p) {
		margin: 0;
		color: var(--text-muted);
	}

	.card :global(p.email) {
		overflow-wrap: anywhere;
		color: var(--text);
		font-weight: 500;
	}

	.card form {
		padding-top: var(--space-2);
	}

	.flash {
		margin: 0;
		padding: var(--space-3) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
	}

	.flash.bad {
		color: var(--negative);
	}
</style>
