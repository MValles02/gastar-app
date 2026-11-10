<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Clock from '@lucide/svelte/icons/clock';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { StatusTone } from '$lib/plan';

	/** Status chip: tinted fill with the tone colour as text, plus an icon for every tone but neutral. */
	let { tone, label }: { tone: StatusTone; label: string } = $props();

	const icon = { ok: Check, warning: Clock, bad: CircleAlert, neutral: null } as const;
	const color = {
		ok: 'var(--positive)',
		warning: 'var(--warning)',
		bad: 'var(--negative)',
		neutral: 'var(--text-muted)'
	} as const;
	const Icon = $derived(icon[tone]);
</script>

<Badge
	variant="secondary"
	class="font-semibold"
	style="background: {tone === 'neutral'
		? 'var(--muted)'
		: `color-mix(in oklab, ${color[tone]} 14%, transparent)`}; color: {color[tone]}"
>
	{#if Icon}<Icon size={14} strokeWidth={2} />{/if}{label}
</Badge>
