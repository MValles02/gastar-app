<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { autosave } from '$lib/autosave';
	import { openShallow } from '$lib/open-shallow';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import ListCard from '$lib/components/ListCard.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import InlineText from '$lib/components/InlineText.svelte';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { themeColors } from '$lib/theme';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/** Same cap as the server's user-name rule. */
	const NAME_MAX = 80;

	// A save sets the name at once; a reload (Deshacer) brings the stored one back in.
	let name = $derived(data.user.name);
	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join('')
	);
	let selected = $derived(data.theme);
	let themeForm: HTMLFormElement;

	const themeOptions = [
		{ value: 'light', label: 'Claro' },
		{ value: 'dark', label: 'Oscuro' },
		{ value: 'system', label: 'Sistema' }
	];

	async function saveName(next: string) {
		if (next.trim() === name) return null;
		return autosave<{ name: string }>({
			path: '?/name',
			fields: { name: next },
			previous: { name },
			apply: (res) => (name = res.name)
		});
	}

	function applyTheme(value: string) {
		if (value === 'light' || value === 'dark') {
			document.documentElement.dataset.theme = value;
		} else {
			delete document.documentElement.dataset.theme;
		}
		const colors = themeColors(value);
		document
			.querySelector('meta[name="theme-color"][media*="light"]')
			?.setAttribute('content', colors.light);
		document
			.querySelector('meta[name="theme-color"][media*="dark"]')
			?.setAttribute('content', colors.dark);
	}
</script>

<svelte:head>
	<title>Perfil · Gastar</title>
</svelte:head>

<PageHeader
	title="Perfil"
	back={{ href: resolve('/'), label: 'Volver al inicio', text: 'Inicio' }}
/>

<div class="page">
	<section class="who" aria-label="Usuario">
		<span class="big" aria-hidden="true">{initials}</span>
		<p class="who-text">
			<span class="name">{name}</span>
			<span class="email">{data.user.email}</span>
		</p>
	</section>

	{#snippet accountsCount()}<span class="val">{data.counts.accounts}</span>{/snippet}
	{#snippet categoriesCount()}<span class="val">{data.counts.categories}</span>{/snippet}
	{#snippet nameValue()}
		<span class="name-edit">
			<InlineText label="Nombre" value={name} maxlength={NAME_MAX} onsave={saveName}>
				{#snippet display()}<span class="val">{name}</span>{/snippet}
			</InlineText>
		</span>
	{/snippet}

	<ListCard aria-label="Lo que administrás">
		<ListRow
			href={resolve('/accounts')}
			lead={{ icon: 'accounts', color: null }}
			title="Cuentas"
			value={accountsCount}
			chevron
		/>
		<ListRow
			href={resolve('/categories')}
			lead={{ icon: 'categories', color: null }}
			title="Categorías"
			value={categoriesCount}
			chevron
		/>
		<ListRow
			href={resolve('/profile/vinculaciones')}
			lead={{ icon: 'phone', color: null }}
			title="Vinculaciones"
			chevron
		/>
	</ListCard>

	<ListCard aria-label="Tu identidad">
		<ListRow lead={{ icon: 'profile', color: null }} title="Nombre" value={nameValue} />
		<ListRow
			href={resolve('/profile/password')}
			lead={{ icon: 'lock', color: null }}
			title="Contraseña"
			chevron
			onclick={(e: MouseEvent) => openShallow(e, resolve('/profile/password'), 'password')}
		/>
	</ListCard>

	<Card.Root class="gap-0 overflow-hidden py-0" aria-label="Tema">
		<form
			method="POST"
			action="?/theme"
			bind:this={themeForm}
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') applyTheme(selected);
					await update({ reset: false });
				};
			}}
		>
			<div class="row">
				<span id="theme-heading">Tema</span>
				<div class="seg">
					<SegmentedControl
						name="theme"
						options={themeOptions}
						bind:value={selected}
						labelledby="theme-heading"
						onchange={() => themeForm.requestSubmit()}
					/>
				</div>
			</div>

			{#if form?.formError}
				<p class="error" role="alert">{form.formError}</p>
			{/if}

			<noscript><Button type="submit" variant="outline">Guardar</Button></noscript>
		</form>
	</Card.Root>

	<form method="POST" action="/logout">
		<ListCard aria-label="Sesión">
			<ListRow submit lead={{ icon: 'logout', color: null }} title="Cerrar sesión" />
		</ListCard>
	</form>

	<a
		class="delete"
		href={resolve('/profile/delete')}
		onclick={(e) => openShallow(e, resolve('/profile/delete'), 'deleteAccount')}>Darme de baja</a
	>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.who {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		min-width: 0;
	}

	.big {
		display: grid;
		flex: none;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: var(--radius-pill);
		background: var(--muted);
		box-shadow: inset 0 0 0 1px var(--border);
		font-size: var(--font-size-lg);
		font-weight: 600;
	}

	.who-text {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.name {
		font-size: var(--font-size-lg);
		font-weight: 600;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.email {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
		overflow-wrap: anywhere;
	}

	.val {
		min-width: 0;
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-muted);
		font-weight: 400;
	}

	/* The 44px tap target would push the value below the row's first line: center it on the title. */
	.name-edit {
		display: block;
		margin-block: calc((1.25rem - var(--tap-target)) / 2);
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-3);
		min-height: 3.5rem;
		padding: var(--space-1) var(--space-4);
		font-size: var(--font-size-base);
	}

	.seg {
		margin-inline-start: auto;
		flex: 0 1 15rem;
		min-width: 0;
		padding-block: var(--space-1);
	}

	/* Quiet on purpose: the destructive path is a drawer away, not a button on the screen. */
	.delete {
		align-self: center;
		display: flex;
		align-items: center;
		min-height: var(--tap-target);
		padding-inline: var(--space-4);
		color: var(--negative);
		font-size: var(--font-size-base);
		text-decoration: none;
	}

	.delete:hover {
		text-decoration: underline;
	}

	.error {
		padding: 0 var(--space-4) var(--space-3);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
