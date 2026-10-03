<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import Card from './Card.svelte';
	import IconBadge from './IconBadge.svelte';
	import PageHeader from './PageHeader.svelte';

	let {
		title,
		back,
		icon,
		color = null,
		label,
		value,
		tone,
		context,
		children
	}: {
		title: string;
		back: { href: string; label: string };
		icon?: ComponentProps<typeof IconBadge>['icon'];
		color?: ComponentProps<typeof IconBadge>['color'];
		label: string;
		value?: string;
		tone?: 'positive' | 'negative' | 'transfer';
		context?: string;
		children?: Snippet;
	} = $props();

	const labelId = $props.id();
</script>

<PageHeader {title} {back} />

<section aria-labelledby={labelId}>
	<Card>
		<div class="hero">
			{#if icon}<IconBadge {icon} {color} />{/if}
			<div class="text">
				<p id={labelId} class="label">{label}</p>
				{#if value}<p class="value {tone}">{value}</p>{/if}
				{#if context}<p class="context">{context}</p>{/if}
			</div>
		</div>
		{#if children}<div class="extra">{@render children()}</div>{/if}
	</Card>
</section>

<style>
	.hero {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.text {
		min-width: 0;
	}

	.label,
	.context {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.value {
		font-size: clamp(1.5rem, 9vw, var(--font-size-hero));
		font-weight: 600;
		line-height: 1.2;
		white-space: normal;
		overflow-wrap: anywhere;
	}

	.positive {
		color: var(--positive);
	}

	.negative {
		color: var(--negative);
	}

	.transfer {
		color: var(--transfer);
	}

	.extra {
		margin-top: var(--space-3);
	}
</style>
