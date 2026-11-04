<script lang="ts">
	import { resolve } from '$app/paths';

	/** Mercado Pago pill of Inicio: pending items to review, or a quiet "al día". Opens the review list. */
	let { pending }: { pending: number } = $props();

	const label = $derived(
		pending > 0
			? `Mercado Pago: ${pending} ${pending === 1 ? 'movimiento' : 'movimientos'} para revisar`
			: 'Mercado Pago: al día'
	);
</script>

<!-- The 32px pill sits in a 44px link so the tap target meets the minimum. -->
<a href={resolve('/imports')} class="mp" class:quiet={pending === 0} aria-label={label}>
	<span class="pill">
		<span class="badge" aria-hidden="true">MP</span>
		{pending > 0 ? `${pending} para revisar` : 'al día'}
	</span>
</a>

<style>
	.mp {
		display: flex;
		align-items: center;
		min-height: var(--tap-target);
		text-decoration: none;
	}

	.pill {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		height: 2rem;
		padding: 0 0.625rem 0 0.375rem;
		border-radius: var(--radius-pill);
		font-size: var(--font-size-sm);
		font-weight: 600;
		white-space: nowrap;
		background: color-mix(in oklab, var(--positive) 14%, transparent);
		color: var(--positive);
	}

	.badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.375rem;
		height: 1.375rem;
		border-radius: 50%;
		background: var(--primary);
		color: var(--on-primary);
		font-size: var(--font-size-xs);
		font-weight: 600;
	}

	.quiet .pill {
		background: none;
		color: var(--text-muted);
		font-weight: 500;
		box-shadow: inset 0 0 0 1px var(--border);
	}

	.quiet .badge {
		background: var(--muted);
		color: var(--text-muted);
	}

	.mp:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
		border-radius: var(--radius-pill);
	}
</style>
