<script lang="ts">
	import * as Empty from '$lib/components/ui/empty/index.js';
	import AlertCircle from '@lucide/svelte/icons/circle-alert';
	import Clock from '@lucide/svelte/icons/clock';
	import * as Item from '$lib/components/ui/item/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import Money from '$lib/components/Money.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const currencyName = { ARS: 'Pesos', USD: 'Dólares' } as const;
</script>

<svelte:head>
	<title>Avisos · Gastar</title>
</svelte:head>

<PageHeader title="Avisos" back={{ href: resolve('/'), label: 'Volver al inicio' }} />

<div class="page">
	{#if data.groups.length === 0}
		<Empty.Root>
			<Empty.Header>
				<Empty.Media variant="icon"><Icon name="bell" size="1rem" /></Empty.Media>
				<Empty.Description>Estás al día.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		{#each data.groups as g (g.currency)}
			<section class="group" aria-labelledby="alerts-{g.currency}">
				<h2 id="alerts-{g.currency}">{currencyName[g.currency]}</h2>
				<ul class="list-card">
					{#each g.items as n (n.id)}
						<li>
							{#snippet row()}
								<Item.Media>
									<span
										class="lead"
										style:--tone={n.color ? `var(--swatch-${n.color})` : null}
										class:tinted={n.color}
										aria-hidden="true"
									>
										{#if n.kind === 'plan'}<Icon name="plan" size="1.25rem" />{:else}{n.name
												.charAt(0)
												.toUpperCase()}{/if}
									</span>
								</Item.Media>
								<Item.Content>
									<Item.Title>{n.name}</Item.Title>
									<Item.Description>
										<span class="sub-line">
											<span class="pill {n.pill.tone}">
												{#if n.pill.tone === 'over'}<AlertCircle size={14} strokeWidth={2} />
												{:else if n.pill.tone === 'due'}<Clock size={14} strokeWidth={2} />{/if}
												{n.pill.label}
											</span>
											<span class="sub">{n.detail}</span>
										</span>
									</Item.Description>
								</Item.Content>
								{#if n.amount !== null}
									<Item.Actions>
										<span class="am">
											<Money cents={-n.amount} currency={g.currency} kind="outcome" />
										</span>
									</Item.Actions>
								{/if}
							{/snippet}
							{#if n.href}
								<Item.Root>
									{#snippet child({ props })}
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- server-built app path (with query) -->
										<a href={n.href} {...props}>{@render row()}</a>
									{/snippet}
								</Item.Root>
							{:else}
								<!-- Opens /plan in this currency: /plan reads it from the cookie, so switch it first. -->
								<form method="POST" action={resolve('/currency')}>
									<input type="hidden" name="currency" value={g.currency} />
									<input type="hidden" name="redirectTo" value="/plan" />
									<Item.Root>
										{#snippet child({ props })}
											<button type="submit" {...props}>{@render row()}</button>
										{/snippet}
									</Item.Root>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	h2 {
		padding: 0 var(--space-1);
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	/* Neutral badge; payments and limits tint it with the category swatch (letter stays on the text token). */
	.lead {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--radius-pill);
		background: var(--muted);
		color: var(--text);
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.lead.tinted {
		background: color-mix(in srgb, var(--tone) 14%, transparent);
	}

	.sub-line {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.am {
		flex: none;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.pill {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.625rem;
		border-radius: var(--radius-pill);
		background: var(--muted);
		color: var(--text-muted);
		font-size: var(--font-size-xs);
		font-weight: 600;
		white-space: nowrap;
	}

	.pill.due {
		background: color-mix(in srgb, var(--swatch-orange) 14%, transparent);
		color: var(--swatch-orange);
	}

	/* Overdue and over-limit are information, not errors: inverted fill, never red. */
	.pill.over {
		background: var(--text);
		color: var(--bg);
	}

	.sub {
		min-width: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}
</style>
