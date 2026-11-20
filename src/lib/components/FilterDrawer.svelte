<script lang="ts">
	import type { Snippet } from 'svelte';
	import BottomDrawer from '#lib/components/BottomDrawer.svelte';
	import { Button } from '#lib/components/ui/button/index.js';

	/**
	 * The "Filtros" drawer shell of a list: the filters scroll above the pinned Limpiar and Ver buttons.
	 * Staged: nothing navigates until Ver, which closes the drawer and calls `onapply`.
	 */
	let {
		open = $bindable(false),
		applyLabel,
		onclear,
		onapply,
		children
	}: {
		open?: boolean;
		/** The Ver button's text ("Ver 3 cuentas"). */
		applyLabel: string;
		onclear: () => void;
		onapply: () => void;
		children: Snippet;
	} = $props();

	const apply = () => {
		open = false;
		onapply();
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
			onclick={apply}>{applyLabel}</Button
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
