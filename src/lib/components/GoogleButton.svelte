<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';

	// "Continuar con Google" above the email form of /login and /signup. A plain POST (no enhance):
	// the ?/google action answers with a 303 to Google, which the browser must follow itself.
</script>

<form method="POST" action="?/google" class="google">
	<Button type="submit" variant="outline" class="w-full">Continuar con Google</Button>
	<p class="or" aria-hidden="true">o</p>
</form>

<style>
	.google {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.or {
		margin: 0;
		text-align: center;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}
</style>
