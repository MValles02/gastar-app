<script lang="ts" generics="Key extends string">
	import { NAME_MAX_LENGTH } from '#lib/constants.ts';
	import type { SwatchKey } from '#lib/appearance.ts';
	import type { IconName } from '#lib/components/Icon.svelte';
	import { hydrated } from '#lib/hydrated.svelte.ts';
	import { es } from '#lib/copy/es.ts';
	import Field from '#lib/components/base/Field.svelte';
	import Glyph from '#lib/components/base/Glyph.svelte';
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
			aria-label={es.ui.iconColor.title}
			aria-haspopup="dialog"
			onclick={() => (glyphOpen = true)}
		>
			<Glyph icon={icon as IconName} tone={color} />
		</button>
	{/if}
	<div class="name">
		<Field
			id="name"
			name="name"
			label={es.ui.name}
			{placeholder}
			autocomplete="off"
			maxlength={NAME_MAX_LENGTH}
			{invalid}
			{describedby}
			bind:value={name}
		/>
	</div>
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

	.name {
		flex: 1;
		min-width: 0;
	}

	/* The name is labelled for assistive technology only; the capsule sits beside the glyph button. */
	.name :global(.label) {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
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
