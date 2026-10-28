<script lang="ts">
	import type { Snippet } from 'svelte';
	import ListRow from '$lib/components/ListRow.svelte';

	/** Details card of account/category pages: label/value rows, then "Ver movimientos" as the last row. */
	let {
		rows,
		movementsHref
	}: { rows: { label: string; value: string | Snippet }[]; movementsHref: string } = $props();
</script>

<div class="detail-card">
	<dl>
		{#each rows as row (row.label)}
			<div class="item">
				<dt>{row.label}</dt>
				<dd>
					{#if typeof row.value === 'string'}{row.value}{:else}{@render row.value()}{/if}
				</dd>
			</div>
		{/each}
	</dl>
	<div role="list" class="more">
		<ListRow href={movementsHref} title="Ver movimientos" chevron />
	</div>
</div>

<style>
	dl {
		margin: 0;
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-3);
		min-height: 3.5rem;
		padding: var(--space-2) var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	dt {
		color: var(--text-muted);
	}

	dd {
		margin: 0;
		min-width: 0;
		text-align: right;
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.more {
		border-top: 1px solid var(--border);
	}

	.item:last-child {
		border-bottom: 0;
	}
</style>
