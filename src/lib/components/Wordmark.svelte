<script lang="ts">
	let { size = '1.75rem' }: { size?: string } = $props();
</script>

<span class="wordmark">
	<svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
		<rect width="28" height="28" rx="8" fill="var(--primary)" />
		<path
			d="M8 10.5h8M8 17h12"
			stroke="var(--on-primary)"
			stroke-width="2.25"
			stroke-linecap="round"
			fill="none"
		/>
	</svg>
	<span class="text">Gastar</span>
</span>

<style>
	.wordmark {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	.text {
		font-family: var(--font-body);
		font-size: var(--font-size-lg);
		font-weight: 600;
		line-height: 1;
		color: var(--primary);
	}
</style>
