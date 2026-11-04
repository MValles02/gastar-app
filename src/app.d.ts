import type { auth } from '$lib/server/auth';

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: Session['user'] | null;
			session: Session['session'] | null;
		}
		/** Shallow-routing state: the "Nuevo movimiento" drawer opened over the current screen. */
		interface PageState {
			newMovement?: import('./routes/(app)/movements/new/$types').PageData;
			/** A movement's detail drawer opened over the list. */
			movement?: import('./routes/(app)/movements/[id]/$types').PageData;
			/** The "Nuevo pago o ingreso fijo" drawer opened over the plan or the wizard. */
			newRule?: import('./routes/(app)/plan/recurring/new/$types').PageData;
		}
	}
}

export {};
