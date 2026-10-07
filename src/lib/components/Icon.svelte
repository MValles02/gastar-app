<script lang="ts">
	import type { AccountIconKey } from '$lib/appearance';

	type IconName =
		| AccountIconKey
		| 'search'
		| 'home'
		| 'accounts'
		| 'plus'
		| 'movements'
		| 'categories'
		| 'profile'
		| 'chevron-left'
		| 'chevron-right'
		| 'transfer'
		| 'plan'
		| 'chart'
		| 'bell';

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
		profile: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4 20c0-4 3.6-6 8-6s8 2 8 6'],
		'chevron-left': ['m15 18-6-6 6-6'],
		'chevron-right': ['m9 18 6-6-6-6'],
		transfer: ['m16 3 4 4-4 4', 'M20 7H4', 'm8 21-4-4 4-4', 'M4 17h16'],
		plan: [
			'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
			'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
			'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'
		],
		chart: ['M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
		bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
		search: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'm21 21-4.3-4.3'],
		bank: ['M3 22h18', 'M6 18v-7', 'M10 18v-7', 'M14 18v-7', 'M18 18v-7', 'M12 2l8 5H4z'],
		wallet: [
			'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1',
			'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'
		],
		cash: [
			'M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
			'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
			'M6 12h.01',
			'M18 12h.01'
		],
		card: ['M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M2 10h20'],
		'piggy-bank': [
			'M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z',
			'M16 11h.01'
		],
		dollar: [
			'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
			'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8',
			'M12 18V6'
		],
		coins: [
			'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z',
			'M18.09 10.37A6 6 0 1 1 10.34 18',
			'M7 6h1v4',
			'm16.71 13.88.7.71-2.82 2.82'
		],
		safe: [
			'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
			'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
			'M8 21v1',
			'M16 21v1'
		],
		briefcase: [
			'M4 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z',
			'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'
		],
		phone: ['M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z', 'M12 18h.01']
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
