<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button/index.js';

	/** "‹ Mes ›" stepper; `nextHref` is null on the current month, which disables the forward arrow. */
	let { label, prevHref, nextHref }: { label: string; prevHref: string; nextHref: string | null } =
		$props();
</script>

<nav class="nav" aria-label="Mes">
	<Button href={prevHref} variant="ghost" size="icon" aria-label="Mes anterior">
		<ChevronLeft aria-hidden="true" />
	</Button>
	<p class="month-label">{label}</p>
	{#if nextHref === null}
		<Button variant="ghost" size="icon" disabled aria-disabled="true" aria-label="Mes siguiente">
			<ChevronRight aria-hidden="true" />
		</Button>
	{:else}
		<Button href={nextHref} variant="ghost" size="icon" aria-label="Mes siguiente">
			<ChevronRight aria-hidden="true" />
		</Button>
	{/if}
</nav>

<style>
	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.month-label {
		font-size: var(--font-size-base);
		font-weight: 600;
	}
</style>
