<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		title,
		action,
		back
	}: { title: string; action?: Snippet; back?: { href: string; label: string } } = $props();
</script>

<div class="header" class:has-back={!!back}>
	{#if back}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass an already resolved href -->
		<a class="back" href={back.href} aria-label={back.label}>
			<Icon name="chevron-left" />
		</a>
	{/if}
	<h1>{title}</h1>
	{#if action}{@render action()}{/if}
</div>

<style>
	/* Row: [back] [title] [action]; the action wraps below the title instead of truncating it. */
	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		min-height: 2.75rem;
		gap: var(--space-2) var(--space-3);
		margin-bottom: var(--space-5);
	}

	.back {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		margin-left: calc(var(--space-2) * -1);
		border-radius: var(--radius-pill);
		color: var(--text);
	}

	@media (hover: hover) {
		.back:hover {
			background: color-mix(in srgb, var(--primary) 8%, transparent);
		}
	}

	.header h1 {
		flex: 1 1 auto;
		min-width: 0;
		margin-bottom: 0;
		/* Centre one title line on the 2.75rem back button while the h1 box stays at the row top. */
		padding-block: calc((2.75rem - 1.2 * var(--font-size-xl)) / 2);
	}

	/* Detail pages keep a single truncated line next to the back button. */
	.has-back h1 {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	h1 {
		font-size: var(--font-size-xl);
		font-weight: 500;
		line-height: 1.2;
		margin-bottom: var(--space-5);
	}
</style>
