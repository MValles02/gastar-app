<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { navigateUp, upOnClick } from '$lib/nav-stack.svelte';
	import { SHEET_FORM, sheet } from '$lib/sheet.svelte';

	/**
	 * Top bar of a form sheet (inside `Sheet`): grabber, Cancelar top-left, centered title, Guardar
	 * top-right. Guardar is a real submit for the sheet form (`form` attribute), or a link with
	 * `submit.href`; Cancelar is a link that pops back. Dragging the bar down past `DISMISS_PX`, or a
	 * downward flick, is Cancelar; a shorter drag springs back.
	 */
	let {
		title,
		cancel,
		dismissHref = cancel.href,
		submit
	}: {
		title: string;
		/** Resolved path of the screen under the sheet; `label` defaults to "Cancelar". */
		cancel: { href: string; label?: string };
		/** Where dragging down goes when it is not `cancel` (a wizard's "Atrás"). */
		dismissHref?: string;
		/** Top-right action; omitted, there is none. `label` defaults to "Guardar". */
		submit?: { label?: string; href?: string; form?: string };
	} = $props();

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
		if (e.type === 'pointerup' && (distance > DISMISS_PX || flick)) void navigateUp(dismissHref);
		else sheet.offset = 0;
	}
</script>

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
	<div class="end">
		{#if submit?.href}
			<Button href={submit.href} class="-mr-1">{submit.label ?? 'Guardar'}</Button>
		{:else if submit}
			<Button
				type="submit"
				form={submit.form ?? SHEET_FORM}
				class="-mr-1"
				disabled={sheet.submitting}
				aria-busy={sheet.submitting ? 'true' : undefined}>{submit.label ?? 'Guardar'}</Button
			>
		{/if}
	</div>
</header>

<style>
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

	/* Sticky only with room to spare, as PageHeader (WCAG 2.4.11, 1.4.10). */
	@media (min-height: 40em) {
		.sheet-bar {
			position: sticky;
			top: 0;
			z-index: 9;
		}
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
