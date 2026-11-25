<script lang="ts">
	import { formatMoney } from '#lib/money.ts';

	/** Month spend (running total per day, `points[0]` = 0) against an even pace of `budget`, in plan pesos. */
	let { points, days, budget }: { points: number[]; days: number; budget: number } = $props();

	const W = 300;
	const H = 88;
	const TOP = 8;
	let today = $derived(points.length - 1);
	let max = $derived(Math.max(budget, ...points));
	const x = (d: number) => (d / days) * W;
	let y = $derived((v: number) => H - (v / max) * (H - TOP));
	let line = $derived(points.map((v, d) => `${x(d)},${y(v)}`).join(' '));
	let area = $derived(`0,${H} ${line} ${x(today)},${H}`);
	let text = $derived(
		`Gastaste ${formatMoney(points[today], 'ARS')} de ${formatMoney(budget, 'ARS')} al día ${today} de ${days}; el ritmo ideal a hoy es ${formatMoney(Math.round((budget * today) / days), 'ARS')}.`
	);
</script>

<div class="chart">
	<svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" aria-hidden="true">
		<polygon class="area" points={area} />
		<line
			class="ideal"
			x1="0"
			y1={y(0)}
			x2={W}
			y2={y(budget)}
			stroke-dasharray="1 5"
			stroke-linecap="round"
			vector-effect="non-scaling-stroke"
		/>
		<polyline class="spend" points={line} vector-effect="non-scaling-stroke" />
	</svg>
	<span
		class="dot"
		aria-hidden="true"
		style:left="{(today / days) * 100}%"
		style:top="{(y(points[today]) / H) * 100}%"
	></span>
	<p class="visually-hidden">{text}</p>
</div>

<style>
	.chart {
		/* Dark --primary is 2.3:1 on the card; a lighter emerald keeps the line at 3:1+. */
		--pace: light-dark(var(--primary), oklch(0.72 0.12 166.913));
		position: relative;
		height: 5.5rem;
	}

	svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.area {
		fill: color-mix(in srgb, var(--pace) 12%, transparent);
	}

	.ideal {
		stroke: var(--border-strong);
		stroke-width: 1.5;
	}

	.spend {
		fill: none;
		stroke: var(--pace);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.dot {
		position: absolute;
		width: 0.75rem;
		height: 0.75rem;
		box-sizing: border-box;
		transform: translate(-50%, -50%);
		border: 3px solid var(--surface);
		border-radius: 50%;
		background: var(--pace);
		outline: 1.5px solid var(--pace);
	}
</style>
