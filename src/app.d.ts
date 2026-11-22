import type { auth } from '#lib/server/auth.ts';
import type { DrawerStates } from './routes/(app)/drawers';
import type { LayoutServerData } from './routes/(app)/$types';

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: Session['user'] | null;
			session: Session['session'] | null;
		}
		// What the (app) layout load adds to every screen's data (missing only if that load failed).
		// Pick fails the typecheck if the load stops returning one of these keys.
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface PageData extends Partial<Pick<LayoutServerData, 'header' | 'alertCount'>> {}
		// Shallow-routing state: the drawers registered in routes/(app)/drawers.ts, opened over the current screen.
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface PageState extends DrawerStates {}
	}
}

export {};
