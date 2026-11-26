<script lang="ts">
	// `primary`: on the emerald band (auth screens), the mark and text flip to on-primary.
	let { size = '1.75rem', tone = 'default' }: { size?: string; tone?: 'default' | 'primary' } =
		$props();

	const fill = $derived(tone === 'primary' ? 'var(--on-primary)' : 'var(--primary)');
	const stroke = $derived(tone === 'primary' ? 'var(--primary)' : 'var(--on-primary)');
</script>

<span class="wordmark" class:primary={tone === 'primary'}>
	<svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
		<rect width="28" height="28" rx="8" {fill} />
		<path d="M8 10.5h8M8 17h12" {stroke} stroke-width="2.25" stroke-linecap="round" fill="none" />
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
		color: var(--text);
	}

	.primary .text {
		color: var(--on-primary);
	}
</style>
