<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button/index.js';
	import { markReplace } from '$lib/nav-stack.svelte';

	/** "‹ Mes ›" stepper; `nextHref` is null on the current month, which disables the forward arrow. */
	let { label, prevHref, nextHref }: { label: string; prevHref: string; nextHref: string | null } =
		$props();

	// 2rem icon buttons with an invisible ::after centred on them: a 44px+ hit area at the same visual size.
	const HIT = 'relative after:absolute after:inset-[calc(50%-1.4rem)]';
</script>

<nav class="nav" aria-label="Mes">
	<Button
		href={prevHref}
		data-sveltekit-replacestate
		onclick={markReplace}
		variant="ghost"
		size="icon"
		aria-label="Mes anterior"
		class={HIT}
	>
		<ChevronLeft aria-hidden="true" />
	</Button>
	<p class="month-label">{label}</p>
	{#if nextHref === null}
		<Button
			variant="ghost"
			size="icon"
			disabled
			aria-disabled="true"
			aria-label="Mes siguiente"
			class={HIT}
		>
			<ChevronRight aria-hidden="true" />
		</Button>
	{:else}
		<Button
			href={nextHref}
			data-sveltekit-replacestate
			onclick={markReplace}
			variant="ghost"
			size="icon"
			aria-label="Mes siguiente"
			class={HIT}
		>
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
