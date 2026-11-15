<script lang="ts" generics="Failure extends Record<string, unknown>">
	import { onMount, type Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { followRedirect } from '#lib/nav-stack.svelte.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import FormActions from '#lib/components/FormActions.svelte';
	import { focusFirstError } from './form-enhance.ts';

	/**
	 * The `<form>` every create/edit form renders: progressive enhancement, the submitting state and
	 * the action bar. `page`: follows the action's redirect, failures re-render from the server
	 * (`errors` refocuses the first invalid field). `drawer`: a redirect calls `onsaved` (follows it
	 * when unset), a failure hands its data to `onfailure` and refocuses, anything else toasts
	 * `errorToast`; the bar is Cancelar (`onclose`) and the submit, disabled once hydrated until
	 * `canSave`. `bind:mounted` tells the fields when JS is running.
	 */
	let {
		action,
		id,
		variant = 'page',
		inPlace = false,
		errors,
		validate,
		onsubmit,
		onfailure,
		onsaved,
		onclose,
		errorToast = 'No se pudo guardar.',
		cancelHref = '/',
		submitLabel = 'Guardar',
		canSave = true,
		danger = false,
		scroll = false,
		bar = true,
		style,
		mounted = $bindable(false),
		submitting = $bindable(false),
		children
	}: {
		action: string;
		/** The form's `id`, for a submit button outside it (`form=`). */
		id?: string;
		variant?: 'page' | 'drawer';
		/** Handle failures and errors here on the page too, like the drawer does. */
		inPlace?: boolean;
		/** Page: the server-rendered field errors. */
		errors?: object;
		/** Checked before posting: false cancels the submit and focuses the first invalid field. */
		validate?: () => boolean;
		onsubmit?: () => void;
		onfailure?: (data: Partial<Failure>) => void;
		/** Drawer: the action redirected to `location` (the save succeeded). */
		onsaved?: (location: string) => void;
		/** Drawer: Cancelar. */
		onclose?: () => void;
		errorToast?: string;
		/** Page: Cancelar's unresolved path. */
		cancelHref?: string;
		submitLabel?: string;
		/** Drawer: the submit is enabled. */
		canSave?: boolean;
		/** Red submit; on the page the bar is not pinned. */
		danger?: boolean;
		/** Fields in a scroll area above a pinned drawer bar: always, or only in the drawer. */
		scroll?: boolean | 'drawer';
		/** false: no action bar; the fields bring their own submit. */
		bar?: boolean;
		/** Layout overrides: `--form-gap`, `--form-pb`, `--actions-mt`. */
		style?: string;
		mounted?: boolean;
		submitting?: boolean;
		children: Snippet;
	} = $props();

	const drawer = $derived(variant === 'drawer');
	const local = $derived(drawer || inPlace);
	const wrap = $derived(scroll === true || (scroll === 'drawer' && drawer));
	let form = $state<HTMLFormElement>();
	onMount(() => (mounted = true));

	$effect(() => {
		if (errors && Object.values(errors).some(Boolean)) focusFirstError(form);
	});

	const submit: SubmitFunction = ({ cancel }) => {
		if (validate && !validate()) {
			cancel();
			focusFirstError(form);
			return;
		}
		submitting = true;
		onsubmit?.();
		return async (input) => {
			const { result } = input;
			if (result.type === 'redirect' && onsaved) onsaved(result.location);
			else if (local && result.type === 'failure') {
				onfailure?.((result.data ?? {}) as Partial<Failure>);
				focusFirstError(form);
			} else if (local && result.type !== 'redirect') toast.error(errorToast);
			else await followRedirect(input);
			submitting = false;
		};
	};
</script>

<form
	bind:this={form}
	{id}
	method="POST"
	{action}
	class="form"
	class:boxed={scroll !== false}
	class:drawer
	class:submitting
	{style}
	novalidate
	use:enhance={submit}
>
	{#if wrap}
		<div class="scroll">{@render children()}</div>
	{:else}
		{@render children()}
	{/if}

	{#if !bar}
		<!-- The fields bring their own submit. -->
	{:else if drawer}
		<div class="actions">
			<Button
				type="button"
				variant="outline"
				class="min-w-0 flex-1 basis-0"
				onclick={() => onclose?.()}>Cancelar</Button
			>
			<Button
				type="submit"
				variant={danger ? 'danger' : 'default'}
				class="min-w-0 flex-1 basis-0 {danger ? 'whitespace-normal' : ''}"
				disabled={mounted && (!canSave || submitting)}
				aria-busy={submitting ? 'true' : undefined}>{submitLabel}</Button
			>
		</div>
	{:else if danger}
		<FormActions {cancelHref} sticky={false}>
			{#snippet primary()}
				<Button
					type="submit"
					variant="danger"
					class="min-w-0 flex-1 basis-0 whitespace-normal"
					disabled={submitting}>{submitLabel}</Button
				>
			{/snippet}
		</FormActions>
	{:else}
		<FormActions {cancelHref} {submitLabel} {submitting} />
	{/if}
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--form-gap, var(--space-4));
		padding-top: var(--space-1);
		padding-bottom: var(--form-pb, 0);
	}

	.form.boxed.drawer {
		flex: 1;
		min-height: 0;
		gap: 0;
		padding: 0;
	}

	.scroll {
		display: flex;
		flex-direction: column;
		gap: var(--form-gap, var(--space-4));
		min-height: 0;
		overflow-y: auto;
	}

	.drawer .scroll {
		padding: var(--space-1) var(--space-4) var(--space-4);
	}

	.submitting .scroll {
		opacity: 0.55;
	}

	.actions {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--actions-mt, 0);
	}

	.boxed .actions {
		padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
		background: var(--popover);
	}
</style>
