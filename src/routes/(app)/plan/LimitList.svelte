<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Group from '#lib/components/base/Group.svelte';
	import { es } from '#lib/copy/es.ts';
	import type { Currency } from '#lib/money.ts';
	import LimitRow from './LimitRow.svelte';

	type Limit = {
		categoryId: string;
		name: string;
		color: string | null;
		icon?: string | null;
		amount: number;
		currency: Currency;
		spent: number;
		over: boolean;
		fast: boolean;
	};

	/** Category limits, one `LimitRow` each; in the wizard (`wizard` step) the rows link to the page. */
	let { limits, wizard }: { limits: Limit[]; wizard?: number } = $props();
</script>

{#if limits.length}
	<Group>
		{#each limits as l (l.categoryId)}
			<LimitRow {l} {wizard} />
		{/each}
	</Group>
{:else}
	<EmptyState icon="plan" description={es.plan.limits.empty} />
{/if}
