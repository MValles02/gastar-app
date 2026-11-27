<script lang="ts">
	import type { Tone } from '#lib/appearance.ts';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import type { StatusTone } from '#lib/plan.ts';

	/** A small state capsule: tinted by tone, with an icon for ok, warning and bad. */
	let { tone, label }: { tone: StatusTone; label: string } = $props();

	const toneOf: Record<StatusTone, Tone> = {
		ok: 'income',
		warning: 'warning',
		bad: 'expense',
		neutral: 'muted'
	};
	const icon: Record<StatusTone, IconName | null> = {
		ok: 'check',
		warning: 'clock',
		bad: 'alert',
		neutral: null
	};
</script>

<span class="status" data-tone={toneOf[tone]} data-neutral={tone === 'neutral' ? '' : undefined}>
	{#if icon[tone]}<Icon name={icon[tone]} size="sm" />{/if}<span class="label">{label}</span>
</span>

<style>
	.status {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		max-width: 100%;
		padding: 0.125rem var(--space-2);
		border-radius: var(--radius-pill);
		color: var(--tone);
		background: color-mix(in oklab, var(--tone) var(--tint-soft), transparent);
		font-size: var(--font-size-xs);
		font-weight: 600;
		line-height: 1.25;
	}

	.status[data-neutral] {
		background: var(--muted);
	}

	.status :global(svg) {
		flex: none;
		width: 1em;
		height: 1em;
	}

	.label {
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
</style>
