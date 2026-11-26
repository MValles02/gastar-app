<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
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
	{#if data.flash}<Card.Root size="sm" class="flash bad" role="alert"
			><Card.Content>{data.flash}</Card.Content></Card.Root
		>{/if}
	{#if data.linked}<Card.Root size="sm" class="flash" role="status"
			><Card.Content>{name} vinculado.</Card.Content></Card.Root
		>{/if}

	<!-- One state card; `ok` shows the heading as a green status pill (the linked state). -->
	{#snippet state(title: string, content: Snippet, action?: string, ok = false)}
		<section aria-labelledby="intro">
			<Card.Root>
				<Card.Content class="state">
					<h2 id="intro" class:pill={ok}>
						{#if ok}<StatusPill tone="ok" label={title} />{:else}{title}{/if}
					</h2>
					{@render content()}
					{#if action}
						<form method="POST" action="?/connect">
							<Button type="submit" class="w-full">{action}</Button>
						</form>
					{/if}
				</Card.Content>
			</Card.Root>
		</section>
	{/snippet}

	{#if !data.connection}
		{@render state(introTitle, intro, `Vincular ${name}`)}
	{:else if data.connection.needsReconnect}
		{@render state('Hay que volver a vincular', reconnect, 'Reconectar')}
	{:else if linkedTitle}
		{@render state(linkedTitle, linked, undefined, true)}
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

	.page :global(.state) {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.page :global(.state h2) {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	.pill {
		display: flex;
	}

	/* The paragraphs come from the provider's snippets, so they carry the page's scope, not this one's. */
	.page :global(.state p) {
		margin: 0;
		color: var(--text-muted);
	}

	.page :global(.state p.email) {
		overflow-wrap: anywhere;
		color: var(--text);
		font-weight: 500;
	}

	.page :global(.state form) {
		padding-top: var(--space-2);
	}

	.page :global(.flash) {
		font-size: var(--font-size-base);
	}

	.page :global(.flash.bad) {
		color: var(--negative);
	}
</style>
