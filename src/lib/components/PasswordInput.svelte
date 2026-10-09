<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from '$lib/components/Icon.svelte';

	// `#password` / `name="password"` input with a show/hide toggle; the page renders the label.
	let {
		value = $bindable(''),
		autocomplete,
		invalid = false,
		describedby,
		minlength
	}: {
		value?: string;
		autocomplete: HTMLInputAttributes['autocomplete'];
		invalid?: boolean;
		describedby?: string;
		minlength?: number;
	} = $props();

	let showPassword = $state(false);
</script>

<div class="control">
	<input
		id="password"
		type={showPassword ? 'text' : 'password'}
		name="password"
		{autocomplete}
		bind:value
		required
		{minlength}
		aria-invalid={invalid ? true : undefined}
		aria-describedby={describedby}
	/>
	<button
		type="button"
		class="eye"
		aria-pressed={showPassword}
		onclick={() => (showPassword = !showPassword)}
	>
		<Icon name={showPassword ? 'eye-off' : 'eye'} size="1.25rem" />
		<span class="visually-hidden">
			{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
		</span>
	</button>
</div>

<style>
	.control {
		position: relative;
	}

	.control input {
		padding-right: 2.75rem;
	}

	.eye {
		position: absolute;
		top: 0;
		right: 0;
		width: 2.75rem;
		height: 100%;
		padding: 0;
		background: none;
		border: 0;
		color: var(--text-muted);
	}
</style>
