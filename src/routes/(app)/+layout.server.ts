import { alerts } from '$lib/server/alerts';
import { LOCALE } from '$lib/locale';
import { TZ } from '$lib/server/month';
import { requireUser } from '$lib/server/require-user';
import type { LayoutServerLoad } from './$types';

const dayFmt = new Intl.DateTimeFormat(LOCALE, {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	timeZone: TZ
});

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const name = user.name?.trim() || user.email;
	const now = new Date();
	const date = dayFmt.format(now);
	// Refreshed on full loads and form actions.
	// A failure here must not take down every screen: log it and show no badge.
	let alertCount = 0;
	try {
		alertCount = (await alerts(user.id)).length;
	} catch (err) {
		console.error('alerts failed', err);
	}
	return {
		alertCount,
		header: {
			date,
			firstName: name.split(/[\s@]/)[0],
			initials: name
				.split(/\s+/)
				.slice(0, 2)
				.map((w) => w[0]?.toUpperCase() ?? '')
				.join('')
		}
	};
};
