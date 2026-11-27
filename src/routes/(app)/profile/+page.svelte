<script lang="ts">
	import Group from '#lib/components/base/Group.svelte';
	import Row from '#lib/components/base/Row.svelte';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { autosave } from '#lib/autosave.ts';
	import { openShallow } from '#lib/open-shallow.ts';
	import Header from '#lib/components/base/Header.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import InlineText from '#lib/components/InlineText.svelte';
	import SegmentedControl from '#lib/components/SegmentedControl.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { USER_NAME_MAX_LENGTH } from '#lib/constants.ts';
	import { applyTheme, THEME_OPTIONS } from '#lib/theme.ts';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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

	async function saveName(next: string) {
		if (next.trim() === name) return null;
		return autosave<{ name: string }>({
			path: '?/name',
			fields: { name: next },
			previous: { name },
			apply: (res) => (name = res.name)
		});
	}
</script>

<svelte:head>
	<title>Perfil · Gastar</title>
</svelte:head>

<Header title="Perfil" back={{ href: resolve(''), label: 'Volver al inicio' }} />

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
			<InlineText label="Nombre" value={name} maxlength={USER_NAME_MAX_LENGTH} onsave={saveName}>
				{#snippet display()}<span class="val">{name}</span>{/snippet}
			</InlineText>
		</span>
	{/snippet}

	<Group aria-label="Lo que administrás">
		<Row
			href={resolve('accounts')}
			glyph={{ icon: 'accounts', tone: 'neutral' }}
			title="Cuentas"
			trailing={accountsCount}
			chevron
		/>
		<Row
			href={resolve('categories')}
			glyph={{ icon: 'categories', tone: 'neutral' }}
			title="Categorías"
			trailing={categoriesCount}
			chevron
		/>
		<Row
			href={resolve('profile/vinculaciones')}
			glyph={{ icon: 'phone', tone: 'neutral' }}
			title="Vinculaciones"
			chevron
		/>
	</Group>

	<Group aria-label="Tu identidad">
		<Row glyph={{ icon: 'profile', tone: 'neutral' }} title="Nombre" trailing={nameValue} />
		<Row
			href={resolve('profile/password')}
			glyph={{ icon: 'lock', tone: 'neutral' }}
			title={data.hasPassword ? 'Contraseña' : 'Crear contraseña'}
			chevron
			onclick={(e: MouseEvent) => openShallow(e, resolve('profile/password'), 'password')}
		/>
	</Group>

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
						options={THEME_OPTIONS}
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
		<Group aria-label="Sesión">
			<Row submit glyph={{ icon: 'logout', tone: 'neutral' }} title="Cerrar sesión" />
		</Group>
	</form>

	<a
		class="delete"
		href={resolve('profile/delete')}
		onclick={(e) => openShallow(e, resolve('profile/delete'), 'deleteAccount')}>Darme de baja</a
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
		background: var(--surface);
		border: 1px solid var(--card-edge);
		box-shadow: var(--shadow-1);
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
