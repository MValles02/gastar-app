import type { auth } from '#lib/server/auth.ts';
import type { DrawerStates } from './routes/(app)/drawers';

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: Session['user'] | null;
			session: Session['session'] | null;
		}
		// Shallow-routing state: the drawers registered in routes/(app)/drawers.ts, opened over the current screen.
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface PageState extends DrawerStates {}
	}
}

export {};
