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
	}
}

export {};
