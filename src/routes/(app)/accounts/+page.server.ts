import type { PageServerLoad } from './$types';
import { accountSummary } from '$lib/server/dashboard-queries';
import { accountOriginSums, accountTransfersIn, listAccounts } from '$lib/server/accounts-queries';
import { withBalances } from '$lib/server/accounts';
import { CURRENCIES } from '$lib/money';

const SEARCH_MAX_LENGTH = 40;
const CURRENCY_GROUPS = [
	['ARS', 'Pesos'],
	['USD', 'Dólares']
] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, SEARCH_MAX_LENGTH);
	const currency = CURRENCIES.find((c) => c === url.searchParams.get('currency')) ?? '';
	const archived = url.searchParams.get('archived') === '1';

	const [summary, accounts, sums, ins] = await Promise.all([
		accountSummary(userId),
		listAccounts(userId, { q, currency: currency || undefined, archived }),
		accountOriginSums(userId),
		accountTransfersIn(userId)
	]);

	const withBal = withBalances(accounts, sums, ins);
	const groups = CURRENCY_GROUPS.flatMap(([cur, label]) => {
		const items = withBal.filter((a) => a.currency === cur);
		if (items.length === 0) return [];
		const total = items.filter((a) => a.archivedAt === null).reduce((s, a) => s + a.balance, 0);
		return [{ currency: cur, label, total, accounts: items }];
	});

	return {
		filters: { q, archived, currency },
		hasAnyAccount: summary.some((s) => s.count > 0),
		groups
	};
};
