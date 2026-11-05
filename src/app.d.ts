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
			/** A category limit's detail drawer opened over the plan. */
			limit?: import('./routes/(app)/plan/limits/[categoryId]/$types').PageData;
			/** The "Nuevo límite" drawer opened over the plan or the wizard. */
			newLimit?: import('./routes/(app)/plan/limits/new/$types').PageData;
			/** The "Nueva cuenta" drawer opened over the Cuentas list. */
			newAccount?: import('./routes/(app)/accounts/new/$types').PageData;
			/** The "Nueva categoría" drawer opened over the Categorías list. */
			newCategory?: import('./routes/(app)/categories/new/$types').PageData;
			/** The "Cambiar contraseña" drawer opened over Perfil. */
			password?: import('./routes/(app)/profile/password/$types').PageData;
			/** The "¿Darte de baja?" drawer opened over Perfil. */
			deleteAccount?: import('./routes/(app)/profile/delete/$types').PageData;
			/** A Mercado Pago item's review drawer opened over the inbox. */
			importItem?: import('./routes/(app)/imports/[id]/$types').PageData;
			/** The Ahorro drawer opened over the plan. */
			savings?: import('./routes/(app)/plan/savings/$types').PageData;
			/** The "Registrar <regla fija>" drawer opened over the rule's detail. */
			registerRule?: import('./routes/(app)/movements/new/$types').PageData;
		}
	}
}

export {};
