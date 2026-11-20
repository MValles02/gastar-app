import { todayLabel } from './month';

export const initials = (name: string) =>
	name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? '')
		.join('');

export function appHeader(user: { name?: string | null; email: string }, now: Date) {
	const name = user.name?.trim() || user.email;
	return { date: todayLabel(now), firstName: name.split(/[\s@]/)[0], initials: initials(name) };
}
