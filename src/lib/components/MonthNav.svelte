<script lang="ts">
	import Icon from './Icon.svelte';

	/** "‹ Mes ›" stepper; `nextHref` is null on the current month, which disables the forward arrow. */
	let { label, prevHref, nextHref }: { label: string; prevHref: string; nextHref: string | null } =
		$props();
</script>

<nav class="nav" aria-label="Mes">
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass resolved hrefs -->
	<a class="arrow" href={prevHref} aria-label="Mes anterior">
		<Icon name="chevron-left" />
	</a>
	<p class="month-label">{label}</p>
	{#if nextHref === null}
		<span class="arrow disabled" role="link" aria-disabled="true" aria-label="Mes siguiente">
			<Icon name="chevron-right" />
		</span>
	{:else}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass resolved hrefs -->
		<a class="arrow" href={nextHref} aria-label="Mes siguiente">
			<Icon name="chevron-right" />
		</a>
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

	.arrow {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--tap-target);
		height: var(--tap-target);
		border-radius: var(--radius-pill);
		color: var(--text);
		transition: background-color var(--ease-fast);
	}

	.arrow.disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	a.arrow:active {
		background: var(--muted);
	}

	@media (hover: hover) {
		a.arrow:hover {
			background: var(--muted);
		}
	}
</style>
