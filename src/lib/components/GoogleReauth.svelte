<script lang="ts" module>
	import type { ReauthMode } from '#lib/server/reauth.ts';

	/** A Google-only user confirms by signing in again: always when stale, and when recent only after a post asked for it. */
	export function needsGoogleReauth(mode: ReauthMode, asked: boolean): boolean {
		return mode === 'stale' || (mode === 'recent' && asked);
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';

	let { action, message, children }: { action: string; message?: string; children: Snippet } =
		$props();
</script>

{@render children()}
{#if message}<p class="error" role="alert">{message}</p>{/if}
<!-- Plain form: it leaves for Google with a full navigation. -->
<form method="POST" {action}>
	<Button type="submit">Confirmar con Google</Button>
</form>

<style>
	.error {
		color: var(--negative);
		font-size: var(--font-size-sm);
	}
</style>
