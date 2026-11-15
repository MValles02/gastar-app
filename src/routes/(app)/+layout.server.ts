import { alerts } from '#lib/server/plan/alerts.ts';
import { requireUser } from '#lib/server/guards.ts';
import { appHeader } from '#lib/server/header.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const header = appHeader(user, new Date());
	// Refreshed on full loads and form actions.
	// A failure here must not take down every screen: log it and show no badge.
	let alertCount = 0;
	try {
		alertCount = (await alerts(user.id)).length;
	} catch (err) {
		console.error('alerts failed', err);
	}
	return { alertCount, header };
};
