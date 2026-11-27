<script lang="ts">
	import type { Snippet } from 'svelte';
	import Glyph, { type GlyphSpec } from '#lib/components/base/Glyph.svelte';
	import Status from '#lib/components/base/Status.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { appear } from '#lib/motion.ts';
	import type { StatusTone } from '#lib/plan.ts';

	/**
	 * One row of a `Group`. Line 1: title and trailing (the value); line 2: status and subtitle;
	 * footer: a full-width third line. Mode: a link (`href`), a submit button (`submit`), a button
	 * (`onclick`) or a plain block. `action`: the row's own controls at its right end; with `href` the
	 * title becomes the link, stretched over the row, so the controls can sit above it. `stacked`: the
	 * status alone on line 2 and the subtitle on line 3. `item={false}`: no own `<li>` (the row sits
	 * inside a caller's `<li>`); `class` then lands on the row itself.
	 */
	let {
		title,
		subtitle,
		status,
		glyph,
		trailing,
		chevron = false,
		action,
		footer,
		stacked = false,
		dimmed = false,
		href,
		onclick,
		submit = false,
		haspopup = false,
		labelFor,
		titleId,
		trailingId,
		labelledby,
		describedby,
		invalid = false,
		ref = $bindable(null),
		error,
		errorId,
		item = true,
		class: className = ''
	}: {
		title: string;
		subtitle?: string | Snippet;
		status?: { tone: StatusTone; label: string };
		glyph?: GlyphSpec;
		trailing?: Snippet;
		chevron?: boolean;
		action?: Snippet;
		footer?: Snippet;
		stacked?: boolean;
		dimmed?: boolean;
		/** Already resolved. */
		href?: string;
		/** With `href`: lets a caller open the target as a drawer (shallow route) on a plain click. */
		onclick?: (e: MouseEvent) => void;
		submit?: boolean;
		haspopup?: boolean;
		labelFor?: string;
		titleId?: string;
		trailingId?: string;
		labelledby?: string;
		describedby?: string;
		invalid?: boolean;
		ref?: HTMLElement | null;
		error?: string;
		errorId?: string;
		item?: boolean;
		class?: string;
	} = $props();

	const popup = $derived(haspopup ? 'dialog' : undefined);
	// Spread: the role-supports-aria check can't see these on the implicit link or button role.
	const aria = $derived({
		'aria-labelledby': labelledby,
		'aria-describedby': describedby,
		'aria-invalid': invalid ? ('true' as const) : undefined
	});
</script>

{#snippet sub()}
	<span class="meta"
		>{#if typeof subtitle === 'string'}{subtitle}{:else if subtitle}{@render subtitle()}{/if}</span
	>
{/snippet}

{#snippet body()}
	{#if glyph}
		<span class="lead" class:dimmed><Glyph {...glyph} /></span>
	{/if}
	<span class="content">
		<span class="line">
			{#if href && action}<span class="title" id={titleId}
					><!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- callers pass a resolved href --><a
						{href}
						{onclick}
						bind:this={ref}
						class="stretch tap">{title}</a
					></span
				>{:else if labelFor}<label class="title" class:dimmed id={titleId} for={labelFor}
					>{title}</label
				>{:else}<span class="title" class:dimmed id={titleId}>{title}</span>{/if}
			{#if trailing}<span class="trailing" class:dimmed id={trailingId}>{@render trailing()}</span
				>{/if}
		</span>
		{#if stacked}
			{#if status}<span class="second"><Status tone={status.tone} label={status.label} /></span
				>{/if}
			{#if subtitle}<span class="second">{@render sub()}</span>{/if}
		{:else if status || subtitle}
			<span class="second gap">
				{#if status}<Status tone={status.tone} label={status.label} />{/if}
				{#if subtitle}{@render sub()}{/if}
			</span>
		{/if}
	</span>
	{#if action}<span class="action">{@render action()}</span>{/if}
	{#if chevron}<span class="chevron"><Icon name="chevron-right" size="sm" /></span>{/if}
	{#if footer}<span class="footer">{@render footer()}</span>{/if}
{/snippet}

{#snippet face()}
	{#if href && action}
		<div class="row stretched">{@render body()}</div>
	{:else if href}
		<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass a resolved href -->
		<a {href} {onclick} bind:this={ref} class={['row tap', !item && className]} {...aria}
			>{@render body()}</a
		>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{:else if submit}
		<button type="submit" bind:this={ref} class={['row tap', !item && className]} {...aria}
			>{@render body()}</button
		>
	{:else if onclick}
		<button
			type="button"
			{onclick}
			bind:this={ref}
			class={['row tap', !item && className]}
			aria-haspopup={popup}
			{...aria}>{@render body()}</button
		>
	{:else}
		<div class={['row', !item && className]}>{@render body()}</div>
	{/if}
	{#if error}<p class="error" id={errorId} role="alert" in:appear>{error}</p>{/if}
{/snippet}

{#if item}
	<li role="listitem" class={className}>{@render face()}</li>
{:else}
	{@render face()}
{/if}

<style>
	li {
		list-style: none;
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		position: relative;
		width: 100%;
		padding: var(--space-row-y) var(--space-row-x);
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: var(--font-size-base);
		text-align: start;
		text-decoration: none;
	}

	.row.stretched:has(.stretch:active) {
		background: var(--muted);
	}

	/* Interactive rows: long-press neither selects text nor opens the link callout. */
	.tap {
		cursor: pointer;
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.tap:active {
		background: var(--muted);
	}

	.row:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: -2px;
	}

	.lead {
		display: inline-flex;
		flex: none;
	}

	.lead.dimmed {
		opacity: 0.5;
	}

	.content {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
		gap: var(--space-1);
	}

	.line {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
	}

	.title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.trailing {
		flex: none;
		max-width: 60%;
		text-align: end;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.dimmed {
		color: var(--text-muted);
	}

	.second {
		display: flex;
		min-width: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.second.gap {
		align-items: center;
		gap: var(--space-2);
	}

	.meta {
		flex: 0 1 auto;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.action {
		position: relative;
		z-index: 1;
		display: flex;
		flex: none;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-1);
	}

	.chevron {
		display: flex;
		flex: none;
		color: var(--text-muted);
	}

	.footer {
		flex-basis: 100%;
		min-width: 0;
	}

	/* The title link covers the whole row; the row's own controls sit above it. */
	.stretch {
		color: inherit;
		text-decoration: none;
	}

	.stretch::after {
		content: '';
		position: absolute;
		inset: 0;
	}

	.stretch:focus-visible {
		outline: none;
	}

	.stretch:focus-visible::after {
		outline: 2px solid var(--ring);
		outline-offset: -2px;
	}

	.error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		padding: 0 var(--space-row-x) var(--space-3);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
