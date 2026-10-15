<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Item from '$lib/components/ui/item/index.js';
	import IconBadge from '$lib/components/IconBadge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import SegmentedControl from '$lib/components/SegmentedControl.svelte';
	import { themeColors } from '$lib/theme';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const initials = $derived(
		data.user.name
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

<PageHeader title="Perfil" back={{ href: resolve('/'), label: 'Volver al inicio' }} />

<div class="page">
	<section class="who" aria-label="Usuario">
		<span class="big" aria-hidden="true">{initials}</span>
		<p class="name">{data.user.name}</p>
		<p class="email">{data.user.email}</p>
	</section>

	<Card.Root class="gap-0 overflow-hidden py-0" aria-label="Tu cuenta">
		<ul class="links">
			<li>
				<Item.Root>
					{#snippet child({ props })}
						<a href={resolve('/profile/name')} {...props}>
							<Item.Content><Item.Title>Nombre</Item.Title></Item.Content>
							<Item.Actions class="min-w-0">
								<span class="val">{data.user.name}</span>
								<Icon name="chevron-right" size="1.25rem" />
							</Item.Actions>
						</a>
					{/snippet}
				</Item.Root>
			</li>
			<li>
				<Item.Root>
					{#snippet child({ props })}
						<a href={resolve('/profile/password')} {...props}>
							<Item.Content><Item.Title>Cambiar contraseña</Item.Title></Item.Content>
							<Item.Actions><Icon name="chevron-right" size="1.25rem" /></Item.Actions>
						</a>
					{/snippet}
				</Item.Root>
			</li>
		</ul>
	</Card.Root>

	<nav aria-label="Administrar">
		<Card.Root class="gap-0 overflow-hidden py-0">
			<ul class="links">
				<li>
					<Item.Root>
						{#snippet child({ props })}
							<a href={resolve('/accounts')} {...props}>
								<Item.Media><IconBadge icon="accounts" color={null} neutral /></Item.Media>
								<Item.Content><Item.Title>Cuentas</Item.Title></Item.Content>
								<Item.Actions><Icon name="chevron-right" size="1.25rem" /></Item.Actions>
							</a>
						{/snippet}
					</Item.Root>
				</li>
				<li>
					<Item.Root>
						{#snippet child({ props })}
							<a href={resolve('/categories')} {...props}>
								<Item.Media><IconBadge icon="categories" color={null} neutral /></Item.Media>
								<Item.Content><Item.Title>Categorías</Item.Title></Item.Content>
								<Item.Actions><Icon name="chevron-right" size="1.25rem" /></Item.Actions>
							</a>
						{/snippet}
					</Item.Root>
				</li>
			</ul>
		</Card.Root>
	</nav>

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

			{#if form?.error}
				<p class="error" role="alert">{form.error}</p>
			{/if}

			<noscript><Button type="submit" variant="outline">Guardar</Button></noscript>
		</form>
	</Card.Root>

	<div class="session">
		<form method="POST" action="/logout">
			<Button type="submit" variant="outline" class="w-full"
				><Icon name="logout" size="1.25rem" />Cerrar sesión</Button
			>
		</form>

		<Button
			href={resolve('/profile/delete')}
			variant="ghost"
			class="text-destructive hover:text-destructive w-full">Eliminar cuenta</Button
		>
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.who {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--space-1);
		min-width: 0;
	}

	.big {
		display: grid;
		place-items: center;
		width: 4.5rem;
		height: 4.5rem;
		margin-bottom: var(--space-2);
		border-radius: var(--radius-pill);
		background: var(--muted);
		box-shadow: inset 0 0 0 1px var(--border);
		font-size: 1.5rem;
		font-weight: 600;
	}

	.name {
		font-family: var(--font-display);
		font-size: 1.625rem;
		font-weight: 500;
		line-height: 1.2;
		letter-spacing: -0.01em;
		max-width: 100%;
		overflow-wrap: anywhere;
	}

	.email {
		color: var(--text-muted);
		max-width: 100%;
		overflow-wrap: anywhere;
	}

	.links {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.val {
		min-width: 0;
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-muted);
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

	.session {
		display: flex;
		flex-direction: column;
		gap: var(--space-8, 2rem);
	}

	.error {
		padding: 0 var(--space-4) var(--space-3);
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
