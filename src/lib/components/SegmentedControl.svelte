<script lang="ts">
	let {
		name,
		options,
		value = $bindable(),
		labelledby,
		onchange,
		disabled = false
	}: {
		name: string;
		options: { value: string; label: string }[];
		value: string;
		labelledby?: string;
		onchange?: () => void;
		disabled?: boolean;
	} = $props();
</script>

<div class="track" role="radiogroup" aria-labelledby={labelledby}>
	{#each options as option (option.value)}
		<label class="option">
			<input type="radio" {name} value={option.value} bind:group={value} {onchange} {disabled} />
			<span>{option.label}</span>
		</label>
	{/each}
</div>

<style>
	.track {
		display: flex;
		min-width: 0;
		max-width: 100%;
		gap: var(--space-1);
		padding: var(--space-1);
		background: var(--bg);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-pill);
	}

	.option {
		position: relative;
		flex: 1 1 0;
		min-width: 0;
		padding-inline: var(--space-1);
		flex-direction: row;
		align-items: center;
		justify-content: center;
		min-height: 2.75rem;
		border-radius: var(--radius-pill);
		font-size: var(--font-size-base);
		font-weight: 500;
		color: var(--text);
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.option span {
		min-width: 0;
		overflow-wrap: anywhere;
		text-align: center;
	}

	@media (max-width: 26rem) {
		.option {
			font-size: var(--font-size-sm);
		}
	}

	.option input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		opacity: 0;
		cursor: pointer;
	}

	.option:has(input:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.option input:disabled {
		cursor: not-allowed;
	}

	.option:has(input:checked) {
		background: var(--primary);
		color: var(--on-primary);
	}

	.option:has(input:focus-visible) {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
</style>
