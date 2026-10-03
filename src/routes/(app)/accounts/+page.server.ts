import type { PageServerLoad } from './$types';
import { accountSummary } from '$lib/server/dashboard-queries';
import { accountOriginSums, accountTransfersIn, listAccounts } from '$lib/server/accounts-queries';
import { withBalances } from '$lib/server/accounts';
import { parseCurrencyPref } from '$lib/server/currency-pref';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const userId = locals.user!.id;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 40);
	const pref = parseCurrencyPref(cookies.get('currency'));
	const archived = url.searchParams.get('archived') === '1';

	const [summary, accounts, sums, ins] = await Promise.all([
		accountSummary(userId),
		listAccounts(userId, { q, currency: pref === 'both' ? undefined : pref, archived }),
		accountOriginSums(userId),
		accountTransfersIn(userId)
	]);

	return {
		filters: { q, archived },
		currency: pref,
		hasAnyAccount: summary.some((s) => s.count > 0 && (pref === 'both' || s.currency === pref)),
		accounts: withBalances(
			accounts,
			sums,
			ins.flatMap((t) => (t.accountId ? [{ ...t, accountId: t.accountId }] : []))
		)
	};
};
