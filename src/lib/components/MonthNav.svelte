<script lang="ts">
	import CircleButton from '#lib/components/base/CircleButton.svelte';
	import { es } from '#lib/copy/es.ts';
	import { markReplace } from '#lib/nav-stack.svelte.ts';

	/** "‹ Mes ›" stepper; `nextHref` is null on the current month, which disables the forward arrow. */
	let { label, prevHref, nextHref }: { label: string; prevHref: string; nextHref: string | null } =
		$props();
</script>

<nav class="nav" aria-label={es.ui.month}>
	<CircleButton
		icon="chevron-left"
		tone="ghost"
		href={prevHref}
		label={es.ui.prevMonth}
		data-sveltekit-replacestate
		onclick={markReplace}
	/>
	<p class="month-label">{label}</p>
	{#if nextHref === null}
		<CircleButton icon="chevron-right" tone="ghost" label={es.ui.nextMonth} disabled />
	{:else}
		<CircleButton
			icon="chevron-right"
			tone="ghost"
			href={nextHref}
			label={es.ui.nextMonth}
			data-sveltekit-replacestate
			onclick={markReplace}
		/>
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
