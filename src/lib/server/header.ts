import { todayLabel } from './month';

/** Up to two initials from a display name's first words, upper-cased. */
export const initials = (name: string) =>
	name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? '')
		.join('');

/** The (app) header for a user: today's date, the greeting's first name and the avatar initials. */
export function appHeader(user: { name?: string | null; email: string }, now: Date) {
	const name = user.name?.trim() || user.email;
	return { date: todayLabel(now), firstName: name.split(/[\s@]/)[0], initials: initials(name) };
}
