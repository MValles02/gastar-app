<script lang="ts">
	import * as Empty from '$lib/components/ui/empty/index.js';
	import Icon from '$lib/components/Icon.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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
			<section aria-labelledby="alerts-{g.currency}">
				<SectionHeader id="alerts-{g.currency}" title={g.currency} variant="group" />
				<ListCard>
					{#each g.items as n (n.id)}
						{#snippet message()}{n.message}{/snippet}
						{#snippet row(submit: boolean)}
							<ListRow
								href={submit ? undefined : n.href}
								{submit}
								lead={n.kind === 'plan'
									? { icon: 'plan', color: null }
									: n.icon
										? { icon: n.icon, color: n.color }
										: { letter: n.name.charAt(0).toUpperCase(), color: n.color }}
								title={n.name}
								status={n.status}
								meta={message}
								metaLines={2}
							/>
						{/snippet}
						{#if !n.switchCurrency}
							{@render row(false)}
						{:else}
							<!-- Plan and limit pages read the currency from the cookie, so switch it first. -->
							<form method="POST" action={resolve('/currency')} class="contents">
								<input type="hidden" name="currency" value={g.currency} />
								<input type="hidden" name="redirectTo" value={n.href} />
								{@render row(true)}
							</form>
						{/if}
					{/each}
				</ListCard>
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
</style>
