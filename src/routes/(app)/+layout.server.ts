import { TZ } from '$lib/server/month';
import type { LayoutServerLoad } from './$types';

const dayFmt = new Intl.DateTimeFormat('es-AR', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	timeZone: TZ
});

// Top bar data shared by every screen (see PageHeader).
export const load: LayoutServerLoad = ({ locals }) => {
	const user = locals.user!;
	const name = user.name?.trim() || user.email;
	const date = dayFmt.format(new Date()).replace(',', '');
	return {
		header: {
			date: date.charAt(0).toUpperCase() + date.slice(1),
			firstName: name.split(/[\s@]/)[0],
			initials: name
				.split(/\s+/)
				.slice(0, 2)
				.map((w) => w[0]?.toUpperCase() ?? '')
				.join('')
		}
	};
};
