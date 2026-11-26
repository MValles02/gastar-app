<script lang="ts">
	import type { Snippet } from 'svelte';
	import { replaceGoto } from '#lib/nav-stack.svelte.ts';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { Button } from '#lib/components/ui/button/index.js';

	/**
	 * The one "Filtros" sheet of every list: the filters scroll above the pinned Limpiar and "Ver N …"
	 * buttons. Staged: nothing navigates until Ver, which closes the sheet and replaces the URL with
	 * `href` (the list's staged query). The list's FilterBar shows the applied count as a badge.
	 */
	let {
		open = $bindable(false),
		count,
		noun,
		href,
		onclear,
		children
	}: {
		open?: boolean;
		/** Rows the staged filters show; null while it is still being counted ("Ver movimientos"). */
		count: number | null;
		/** Singular and plural, for "Ver N …". */
		noun: [string, string];
		/** The list URL with the staged filters, resolved. */
		href: string;
		/** Back to each filter's default (still staged). */
		onclear: () => void;
		children: Snippet;
	} = $props();

	const label = $derived(
		count === null ? `Ver ${noun[1]}` : `Ver ${count} ${count === 1 ? noun[0] : noun[1]}`
	);

	const apply = () => {
		open = false;
		void replaceGoto(href, { reset: false });
	};
</script>

<BottomDrawer title="Filtros" bare bind:open>
	<div class="scroll">
		{@render children()}
	</div>
	<div class="actions">
		<Button
			type="button"
			variant="outline"
			class="h-[50px] min-w-0 flex-1 basis-0 rounded-full text-[15px] font-semibold"
			onclick={onclear}>Limpiar</Button
		>
		<Button
			type="button"
			class="h-[50px] min-w-0 flex-[2] basis-0 rounded-full text-[15px] font-semibold whitespace-nowrap"
			onclick={apply}>{label}</Button
		>
	</div>
</BottomDrawer>

<style>
	/* The filters scroll; the actions stay pinned below them. */
	.scroll {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-height: 0;
		overflow-y: auto;
		padding: var(--space-1) var(--space-4) var(--space-4);
	}

	.actions {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--popover);
	}
</style>
