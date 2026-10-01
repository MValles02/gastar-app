<script lang="ts">
	let { title }: { title: string } = $props();
</script>

<h1>{title}</h1>

<style>
	h1 {
		font-size: var(--font-size-xl);
		font-weight: 500;
		line-height: 1.2;
		margin-bottom: var(--space-5);
	}
</style>
