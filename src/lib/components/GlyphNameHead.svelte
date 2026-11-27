<script lang="ts" generics="Key extends string">
	import type { ComponentProps } from 'svelte';
	import { NAME_MAX_LENGTH } from '#lib/constants.ts';
	import type { SwatchKey } from '#lib/appearance.ts';
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import IconBadge from './IconBadge.svelte';
	import IconColorDrawer from './IconColorDrawer.svelte';

	/**
	 * The head of the new account / category form: the "Ícono y color" button (with JS), the name input
	 * and the hidden `icon` / `color` fields. The form shows its own errors under it.
	 */
	let {
		name = $bindable(),
		icon = $bindable(),
		color = $bindable(),
		icons,
		placeholder,
		invalid,
		describedby
	}: {
		name: string;
		icon: Key;
		color: SwatchKey;
		/** The icon set: ACCOUNT_ICONS or CATEGORY_ICONS. */
		icons: readonly { key: Key; label: string }[];
		placeholder: string;
		invalid?: boolean;
		/** `id` of the error shown under the head. */
		describedby?: string;
	} = $props();

	const mounted = hydrated();
	let glyphOpen = $state(false);
</script>

<div class="head">
	{#if mounted.current}
		<button
			type="button"
			class="glyph"
			aria-label="Ícono y color"
			aria-haspopup="dialog"
			onclick={() => (glyphOpen = true)}
		>
			<IconBadge icon={icon as ComponentProps<typeof IconBadge>['icon']} {color} size="2.75rem" />
		</button>
	{/if}
	<Field.Field class="flex-1">
		<Field.Label for="name" class="visually-hidden">Nombre</Field.Label>
		<Input
			id="name"
			name="name"
			{placeholder}
			autocomplete="off"
			maxlength={NAME_MAX_LENGTH}
			aria-invalid={invalid ? 'true' : undefined}
			aria-describedby={describedby}
			class="h-11"
			bind:value={name}
		/>
	</Field.Field>
</div>
<input type="hidden" name="icon" value={icon} />
<input type="hidden" name="color" value={color} />

<IconColorDrawer
	bind:open={glyphOpen}
	{icons}
	{icon}
	{color}
	onpick={(pick) => {
		icon = pick.icon;
		color = pick.color;
	}}
/>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.glyph {
		flex: none;
		display: grid;
		place-items: center;
		min-width: var(--tap-target);
		min-height: var(--tap-target);
		padding: 0;
		border: 0;
		background: transparent;
	}
</style>
