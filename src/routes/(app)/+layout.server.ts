import { alerts } from '$lib/server/alerts';
import { LOCALE } from '$lib/locale';
import { TZ } from '$lib/server/month';
import type { LayoutServerLoad } from './$types';

const dayFmt = new Intl.DateTimeFormat(LOCALE, {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	timeZone: TZ
});

// Top bar data shared by every screen (see PageHeader).
export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const name = user.name?.trim() || user.email;
	const now = new Date();
	const date = dayFmt.format(now);
	// Counts alerts, not money, so adding across currencies is fine. Refreshed on full loads and form actions.
	// A failure here must not take down every screen: log it and show no badge.
	let alertCount = 0;
	try {
		alertCount = (await alerts(user.id, now)).reduce((n, g) => n + g.items.length, 0);
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
