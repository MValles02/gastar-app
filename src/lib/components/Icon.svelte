<script lang="ts">
	type IconName = 'home' | 'accounts' | 'plus' | 'movements' | 'categories' | 'profile';

	let { name, size = '1.5rem' }: { name: IconName; size?: string } = $props();

	const paths: Record<IconName, string[]> = {
		home: ['M4 11 12 4l8 7v9H4z', 'M10 20v-5h4v5'],
		accounts: [
			'M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12',
			'M16 14h2'
		],
		plus: ['M12 5v14', 'M5 12h14'],
		movements: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
		categories: ['M3 4h8l10 10-8 8L3 12z', 'M7.5 8.5h.01'],
		profile: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4 20c0-4 3.6-6 8-6s8 2 8 6']
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#each paths[name] as d (d)}
		<path {d} />
	{/each}
</svg>
