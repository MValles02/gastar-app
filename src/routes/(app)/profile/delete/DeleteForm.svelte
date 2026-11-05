<script lang="ts">
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { followRedirect } from '$lib/nav-stack.svelte';
	import { PASSWORD_MAX_LENGTH } from '$lib/limits';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormActions from '$lib/components/FormActions.svelte';
	import TextRow from '$lib/components/TextRow.svelte';

	type Summary = { accounts: number; movements: number; categories: number; hasPlan: boolean };

	/**
	 * The "¿Darte de baja?" confirmation. `drawer`: inside the drawer over Perfil (Cancelar and the red
	 * action sit at the bottom). `page`: the /profile/delete page. Both post `?/delete` to this route.
	 */
	let {
		summary,
		error,
		variant = 'page',
		onclose
	}: {
		summary: Summary;
		error?: string;
		variant?: 'page' | 'drawer';
		/** Drawer: Cancelar. */
		onclose?: () => void;
	} = $props();

	const drawer = $derived(variant === 'drawer');
	const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

	// Only what applies: nothing is listed for an empty user.
	const items = $derived.by(() => {
		const out: string[] = [];
		if (summary.accounts > 0) {
			const accounts = plural(summary.accounts, 'cuenta', 'cuentas');
			out.push(
				summary.movements > 0
					? `${accounts} y ${plural(summary.movements, 'movimiento', 'movimientos')}`
					: accounts
			);
		}
		if (summary.categories > 0) out.push(plural(summary.categories, 'categoría', 'categorías'));
		if (summary.hasPlan) out.push('Tu plan y sus pagos fijos');
		return out;
	});

	let password = $state('');
	let submitting = $state(false);
	// The drawer's post reports the failure here; the page shows the server-rendered one.
	let posted = $state<string | undefined>();
	const message = $derived(posted ?? error);
</script>

<form
	method="POST"
	action="/profile/delete?/delete"
	class="form"
	novalidate
	use:enhance={() => {
		submitting = true;
		posted = undefined;
		return async (input) => {
			const { result } = input;
			if (result.type === 'failure') {
				posted = (result.data as { error?: string } | undefined)?.error;
				await tick();
				document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus();
			} else if (result.type === 'error') {
				toast.error('No se pudo darte de baja.');
			} else {
				await followRedirect(input);
			}
			submitting = false;
		};
	}}
>
	<div class="warn">
		<p>Se borran para siempre tu usuario y todos tus datos:</p>
		{#if items.length}
			<ul>
				{#each items as item (item)}<li>{item}</li>{/each}
			</ul>
		{/if}
	</div>

	<ul class="card">
		<li class:bad={message}>
			<TextRow
				id="delete-password"
				name="password"
				label="Contraseña"
				bind:value={password}
				password
				autocomplete="current-password"
				maxlength={PASSWORD_MAX_LENGTH}
				error={message}
				errorId="delete-error"
			/>
		</li>
	</ul>

	<p class="final">No se puede deshacer.</p>

	{#if drawer}
		<div class="actions">
			<Button
				type="button"
				variant="outline"
				class="h-auto min-h-11 min-w-0 flex-1 basis-0"
				onclick={() => onclose?.()}>Cancelar</Button
			>
			<Button
				type="submit"
				variant="danger"
				class="h-auto min-h-11 min-w-0 flex-1 basis-0 whitespace-normal"
				disabled={!password || submitting}>Darme de baja</Button
			>
		</div>
	{:else}
		<FormActions cancelHref="/profile" sticky={false}>
			{#snippet primary()}
				<Button
					type="submit"
					variant="danger"
					class="h-auto min-h-11 min-w-0 flex-1 basis-0 whitespace-normal"
					disabled={submitting}>Darme de baja</Button
				>
			{/snippet}
		</FormActions>
	{/if}
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-top: var(--space-1);
	}

	.warn {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.warn ul {
		margin: 0;
		padding-inline-start: var(--space-5);
		list-style: disc;
		color: var(--text-muted);
	}

	.card {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-1);
	}

	.card > li.bad {
		box-shadow: inset 3px 0 0 var(--negative);
	}

	.final {
		font-weight: 600;
	}

	.actions {
		display: flex;
		gap: var(--space-3);
	}
</style>
