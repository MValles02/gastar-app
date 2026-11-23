import type { PageServerLoad } from './$types';
import { preferredCurrency } from '#lib/server/currency-pref.ts';
import { reportView } from '#lib/server/dashboard/reports.ts';
import { monthNav, monthParam } from '#lib/server/month.ts';
import { requireUser } from '#lib/server/guards.ts';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = requireUser(locals).id;
	const currency = preferredCurrency(cookies);
	const now = new Date();
	// A future month reads as the current one.
	const ym = monthParam(url, { clamp: true }, now);
	const nav = monthNav(ym, now);

	return { currency, nav, ...(await reportView(userId, currency, ym, now)) };
};
