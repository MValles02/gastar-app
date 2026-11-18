<script lang="ts">
	import { PASSWORD_MAX_LENGTH } from '#lib/fields.ts';
	import FormShell from '#lib/components/forms/FormShell.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import type { ReauthMode } from '#lib/server/reauth.ts';

	type Summary = { accounts: number; movements: number; categories: number; hasPlan: boolean };

	/**
	 * The "¿Darte de baja?" confirmation. `drawer`: inside the drawer over Perfil (Cancelar and the red
	 * action sit at the bottom). `page`: the /profile/delete page. Both post `?/delete` to this route.
	 */
	let {
		summary,
		error,
		reauthMode = 'password',
		reauth = false,
		email = ''
	}: {
		summary: Summary;
		error?: string;
		/** 'password': confirms with it. Otherwise a Google-only user, who confirms by signing in with Google again ('recent': the session is recent enough to delete without it). */
		reauthMode?: ReauthMode;
		/** The last post asked to confirm with Google. */
		reauth?: boolean;
		/** The account being deleted, shown to a user without a password. */
		email?: string;
	} = $props();

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
	// The drawer's post reports the failure here; the page shows the server-rendered one.
	let posted = $state<{ formError?: string; reauth?: boolean } | undefined>();
	const message = $derived(posted ? posted.formError : error);
	const hasPassword = $derived(reauthMode === 'password');
	const needsGoogle = $derived(
		reauthMode === 'stale' || (reauthMode === 'recent' && (!!posted?.reauth || reauth))
	);
</script>

{#snippet warn()}
	<div class="warn">
		<p>Se borran para siempre tu usuario y todos tus datos:</p>
		{#if items.length}
			<ul>
				{#each items as item (item)}<li>{item}</li>{/each}
			</ul>
		{/if}
		{#if !hasPassword}<p>Cuenta: {email}</p>{/if}
	</div>
{/snippet}

{#if needsGoogle}
	{@render warn()}
	<p>Para confirmar, volvé a entrar con Google.</p>
	{#if message}<p class="error" role="alert">{message}</p>{/if}
	<!-- Plain form: it leaves for Google with a full navigation. -->
	<form method="POST" action="/profile/delete?/google">
		<Button type="submit">Confirmar con Google</Button>
	</form>
{:else}
	<FormShell
		action="/profile/delete?/delete"
		inPlace
		onsubmit={() => (posted = undefined)}
		onfailure={(data: { formError?: string; reauth?: boolean }) => (posted = data)}
		errorToast="No se pudo darte de baja."
		cancelHref="/profile"
		submitLabel="Darme de baja"
		canSave={!hasPassword || !!password}
		danger
	>
		{@render warn()}

		{#if hasPassword}
			<div class="field">
				<label for="delete-password">Contraseña</label>
				<PasswordInput
					outlined
					id="delete-password"
					name="password"
					bind:value={password}
					autocomplete="current-password"
					maxlength={PASSWORD_MAX_LENGTH}
					required={false}
					invalid={!!message}
					describedby={message ? 'delete-error' : undefined}
				/>
				{#if message}<p class="error" id="delete-error" role="alert">{message}</p>{/if}
			</div>
		{/if}

		<p class="final">No se puede deshacer.</p>
	</FormShell>
{/if}

<style>
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

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.field label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-muted);
	}

	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}

	.final {
		font-size: 0.9375rem;
		font-weight: 600;
	}
</style>
