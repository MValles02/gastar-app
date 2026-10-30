<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { isPopping, navigateUp, upOnClick } from '$lib/nav-stack.svelte';
	import { SHEET_FORM, sheet } from '$lib/sheet.svelte';

	/**
	 * A form sheet's screen (inside `Sheet`): the top bar (grabber, Cancelar top-left, centered title),
	 * then the screen's content, then Guardar, drawn top-right over the bar. Guardar comes last in the
	 * DOM so Tab goes Cancelar, the fields, Guardar. It is a real submit for the sheet form (`form`
	 * attribute), or a link with `submit.href`; Cancelar is a link that pops back. Dragging the bar down
	 * past `DISMISS_PX`, or a downward flick, is Cancelar; a shorter drag springs back.
	 */
	let {
		title,
		cancel,
		dismissHref = cancel.href,
		submit,
		children
	}: {
		title: string;
		/** Resolved path of the screen under the sheet; `label` defaults to "Cancelar". */
		cancel: { href: string; label?: string };
		/** Where dragging down goes when it is not `cancel` (a wizard's "Atrás"). */
		dismissHref?: string;
		/** Top-right action; omitted, there is none. `label` defaults to "Guardar". */
		submit?: { label?: string; href?: string; form?: string };
		children: Snippet;
	} = $props();

	const submitLabel = $derived(submit?.label ?? 'Guardar');

	const DISMISS_PX = 120;
	/** A release faster than this (px/ms) after at least `FLICK_MIN_PX` dismisses too. */
	const FLICK_SPEED = 0.5;
	const FLICK_MIN_PX = 24;
	/** No move this long before the release: the finger stopped, so it was not a flick. */
	const FLICK_STALE_MS = 100;

	let pointer: number | null = null;
	let startY = 0;
	let lastY = 0;
	let lastT = 0;
	let speed = 0;

	function onpointerdown(e: PointerEvent) {
		if (pointer !== null || e.button !== 0) return;
		if ((e.target as Element).closest('a, button')) return;
		// A pop is already on its way out: a release could not dismiss again and would leave the sheet low.
		if (isPopping()) return;
		pointer = e.pointerId;
		startY = lastY = e.clientY;
		lastT = e.timeStamp;
		speed = 0;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		sheet.dragging = true;
	}

	function onpointermove(e: PointerEvent) {
		if (e.pointerId !== pointer) return;
		const dt = e.timeStamp - lastT;
		if (dt > 0) speed = (e.clientY - lastY) / dt;
		lastY = e.clientY;
		lastT = e.timeStamp;
		sheet.offset = Math.max(0, e.clientY - startY);
	}

	function release(e: PointerEvent) {
		if (e.pointerId !== pointer) return;
		pointer = null;
		sheet.dragging = false;
		const distance = sheet.offset;
		const flick =
			distance > FLICK_MIN_PX && speed > FLICK_SPEED && e.timeStamp - lastT < FLICK_STALE_MS;
		// Dismissing keeps the offset: the 'sheet-down' transition lowers the sheet from where it is.
		const dismiss = e.type === 'pointerup' && (distance > DISMISS_PX || flick) && !isPopping();
		if (dismiss) void navigateUp(dismissHref);
		else sheet.offset = 0;
	}
</script>

<div class="sheet-screen">
	<!-- Dragging is a pointer shortcut for Cancelar, which stays the accessible way to dismiss. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<header
		class="sheet-bar"
		{onpointerdown}
		{onpointermove}
		onpointerup={release}
		onpointercancel={release}
	>
		<span class="grabber" data-sheet-grabber aria-hidden="true"></span>
		<div class="start">
			<Button
				href={cancel.href}
				onclick={upOnClick(cancel.href)}
				variant="ghost"
				class="-ml-3 px-3"
				data-sheet-cancel>{cancel.label ?? 'Cancelar'}</Button
			>
		</div>
		<h1>{title}</h1>
		<!-- Keeps Guardar's width so the title stays centered and never runs under it. -->
		<div class="end" aria-hidden="true">
			{#if submit}<Button tabindex={-1} class="-mr-1">{submitLabel}</Button>{/if}
		</div>
	</header>

	{@render children()}

	{#if submit}
		<div class="submit-layer">
			<div class="submit">
				{#if submit.href}
					<Button href={submit.href} class="-mr-1">{submitLabel}</Button>
				{:else}
					<Button
						type="submit"
						form={submit.form ?? SHEET_FORM}
						class="-mr-1"
						disabled={sheet.submitting}
						aria-busy={sheet.submitting ? 'true' : undefined}>{submitLabel}</Button
					>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* The containing block of the bar and of Guardar's layer: both stick for the whole screen. */
	.sheet-screen {
		position: relative;
	}

	/* Bleeds to the sheet edges (--gutter from Sheet) so scrolled content hides under it. */
	.sheet-bar {
		position: relative;
		display: grid;
		grid-template-columns: minmax(max-content, 1fr) minmax(0, auto) minmax(max-content, 1fr);
		align-items: center;
		gap: var(--space-2);
		margin: 0 calc(var(--gutter) * -1) var(--space-4);
		padding: var(--space-4) var(--gutter) var(--space-2);
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		background: color-mix(in srgb, var(--bg) 92%, transparent);
		-webkit-backdrop-filter: blur(16px);
		backdrop-filter: blur(16px);
		border-bottom: 1px solid var(--border);
		/* The bar is the drag handle: no scrolling or text selection starts on it. */
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		cursor: grab;
	}

	/*
	 * Sticky only with room to spare, as PageHeader (WCAG 2.4.11, 1.4.10). Stuck, it stops below the
	 * notch and a strip of the sheet colour covers the safe area above it; unstuck, that strip sits
	 * above the sheet's top edge, where `Sheet` clips it.
	 */
	@media (min-height: 40em) {
		.sheet-bar {
			position: sticky;
			top: env(safe-area-inset-top, 0px);
			z-index: 9;
		}

		.sheet-bar::before {
			content: '';
			position: absolute;
			inset-inline: 0;
			bottom: 100%;
			height: env(safe-area-inset-top, 0px);
			background: var(--bg);
		}

		.submit {
			position: sticky;
			top: env(safe-area-inset-top, 0px);
		}
	}

	/* Guardar sits over the bar's end column; only the button takes pointer events, not the layer. */
	.submit-layer {
		position: absolute;
		inset: 0;
		z-index: 10;
		pointer-events: none;
	}

	.submit {
		display: flex;
		justify-content: flex-end;
		padding: var(--space-4) 0 var(--space-2);
	}

	.submit :global(> *) {
		pointer-events: auto;
	}

	.end {
		visibility: hidden;
	}

	.grabber {
		position: absolute;
		top: var(--space-2);
		left: 50%;
		width: 2.25rem;
		height: 0.3125rem;
		border-radius: var(--radius-pill);
		background: var(--border-strong);
		transform: translateX(-50%);
	}

	.end {
		display: flex;
		justify-content: flex-end;
	}

	h1 {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
		font-family: var(--font-display);
		font-size: 1.0625rem;
		font-weight: 500;
		letter-spacing: -0.015em;
		line-height: 1.2;
	}
</style>
