<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<h1>Ingresar</h1>

<form method="POST" use:enhance>
	<label>
		Email
		<input type="email" name="email" autocomplete="username" value={form?.email ?? ''} required />
	</label>

	<label>
		Contraseña
		<input type="password" name="password" autocomplete="current-password" required />
	</label>

	{#if form?.error}
		<p>{form.error}</p>
	{/if}

	<button type="submit">Ingresar</button>
</form>
