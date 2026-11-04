<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Card from '$lib/components/ui/card/index.js';
	import { openNewMovement } from '$lib/new-movement';
	import CardEyebrow from './CardEyebrow.svelte';
	import Icon from './Icon.svelte';

	/** "Empezá en 3 pasos" on Inicio; each step's done state comes from the user's existing data. */
	let { steps }: { steps: { account: boolean; movement: boolean; plan: boolean } } = $props();

	type Step = {
		done: boolean;
		title: string;
		hint: string;
		href: string;
		onclick?: (e: MouseEvent) => void;
	};
	const items: Step[] = $derived([
		{
			done: steps.account,
			title: 'Creá tu primera cuenta',
			hint: 'Banco, efectivo o billetera',
			href: resolve('/accounts/new')
		},
		{
			done: steps.movement,
			title: 'Registrá un movimiento',
			hint: 'Con el + de abajo',
			href: resolve('/movements/new'),
			onclick: openNewMovement
		},
		{
			done: steps.plan,
			title: 'Armá tu plan',
			hint: 'Cuánto podés gastar por día',
			href: resolve('/plan/setup')
		}
	]);
	const firstOpen = $derived(items.findIndex((i) => !i.done));
</script>

<section aria-labelledby="first-run-heading">
	<Card.Root class="gap-0 overflow-hidden py-0">
		<div class="head">
			<CardEyebrow as="h2" id="first-run-heading">Empezá en 3 pasos</CardEyebrow>
		</div>
		<ol>
			{#each items as item, i (item.title)}
				{@const locked = !item.done && !steps.account && i > 0}
				{#snippet body()}
					<span class="num" class:primary={i === firstOpen && !locked} aria-hidden={!item.done}>
						{#if item.done}
							<Icon name="check" size="1rem" /><span class="visually-hidden">Hecho: </span>
						{:else}
							{i + 1}
						{/if}
					</span>
					<span class="text">
						<span class="title">{item.title}</span>
						<span class="hint">{item.hint}</span>
						{#if locked}<span class="visually-hidden">Primero creá una cuenta.</span>{/if}
					</span>
					{#if !item.done && !locked}<Icon name="chevron-right" size="1.25rem" />{/if}
				{/snippet}
				<li class:done={item.done} class:locked>
					{#if item.done || locked}
						<div class="row">{@render body()}</div>
					{:else}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- hrefs are resolved above -->
						<a class="row" href={item.href} onclick={item.onclick}>{@render body()}</a>
					{/if}
				</li>
			{/each}
		</ol>
	</Card.Root>
</section>

<style>
	.head {
		padding: var(--space-4) 1.125rem var(--space-3);
	}

	ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--tap-target);
		padding: 0.875rem 1.125rem;
		text-decoration: none;
		color: var(--text);
	}

	a.row :global(svg:last-child) {
		color: var(--border-strong);
	}

	@media (hover: hover) {
		a.row:hover {
			background: var(--muted);
		}
	}

	a.row:active {
		background: var(--muted);
	}

	a.row:focus-visible {
		outline-offset: -2px;
	}

	.num {
		display: flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--muted);
		color: var(--text-muted);
		font-size: var(--font-size-base);
		font-weight: 600;
	}

	.num.primary {
		background: var(--primary);
		color: var(--on-primary);
	}

	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.title {
		font-size: var(--font-size-base);
		font-weight: 500;
	}

	.hint {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.done .title {
		color: var(--text-muted);
	}

	.locked {
		opacity: 0.5;
	}
</style>
