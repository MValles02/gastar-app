import type { PageServerLoad } from './$types';
import { accountSummary } from '$lib/server/dashboard-queries';
import { accountOriginSums, accountTransfersIn, listAccounts } from '$lib/server/accounts-queries';
import { withBalances } from '$lib/server/accounts';
import { requireUser } from '$lib/server/require-user';
import { CURRENCIES } from '$lib/money';

const SEARCH_MAX_LENGTH = 40;
const CURRENCY_GROUPS = [
	['ARS', 'Pesos'],
	['USD', 'Dólares']
] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, SEARCH_MAX_LENGTH);
	const currency = CURRENCIES.find((c) => c === url.searchParams.get('currency')) ?? '';
	const archived = url.searchParams.get('archived') === '1';

	const [summary, all, sums, ins] = await Promise.all([
		accountSummary(userId),
		listAccounts(userId, { archived: true }),
		accountOriginSums(userId),
		accountTransfersIn(userId)
	]);

	// The drawer counts the staged choice client-side from these (every account, archived included).
	const matches = (name: string) => name.toLowerCase().includes(q.toLowerCase());
	const facets = all.map((a) => ({
		currency: a.currency,
		archived: a.archivedAt !== null,
		match: matches(a.name)
	}));
	const accounts = all.filter(
		(a) =>
			(archived || a.archivedAt === null) &&
			(!currency || a.currency === currency) &&
			matches(a.name)
	);
	const accountsWithBalance = withBalances(accounts, sums, ins);
	const groups = CURRENCY_GROUPS.flatMap(([cur, label]) => {
		const items = accountsWithBalance.filter((a) => a.currency === cur);
		if (items.length === 0) return [];
		const total = items.filter((a) => a.archivedAt === null).reduce((s, a) => s + a.balance, 0);
		return [{ currency: cur, label, total, accounts: items }];
	});

	return {
		filters: { q, archived, currency },
		facets,
		hasAnyAccount: summary.some((s) => s.count > 0),
		groups
	};
};
