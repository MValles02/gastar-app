import type { PageServerLoad } from './$types';
import { accountSummary } from '#lib/server/accounts/queries.ts';
import { hasAccounts } from '#lib/server/accounts/balance.ts';
import {
	accountOriginSums,
	accountTransfersIn,
	listAccounts
} from '#lib/server/accounts/queries.ts';
import { withBalances } from '#lib/server/accounts/balance.ts';
import { requireUser } from '#lib/server/guards.ts';
import { listRowShown, matchesQuery, parseListFilter } from '#lib/list-filter.ts';
import { CURRENCY_OPTIONS } from '#lib/money.ts';

const SEARCH_MAX_LENGTH = 40;

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const filters = parseListFilter(url.searchParams, {
		qMax: SEARCH_MAX_LENGTH,
		currencyDefault: ''
	});
	const { q, archived, currency } = filters;

	const [summary, all, sums, ins] = await Promise.all([
		accountSummary(userId),
		listAccounts(userId, { archived: true }),
		accountOriginSums(userId),
		accountTransfersIn(userId)
	]);

	// The drawer counts the staged choice client-side from these (every account, archived included).
	const facets = all.map((a) => ({
		currency: a.currency,
		archived: a.archivedAt !== null,
		match: matchesQuery(a.name, q)
	}));
	const accounts = all.filter((_, i) => listRowShown(facets[i], filters));
	const accountsWithBalance = withBalances(accounts, sums, ins);
	const groups = CURRENCY_OPTIONS.flatMap(({ value: cur, label }) => {
		const items = accountsWithBalance.filter((a) => a.currency === cur);
		if (items.length === 0) return [];
		const total = items.filter((a) => a.archivedAt === null).reduce((s, a) => s + a.balance, 0);
		return [{ currency: cur, label, total, accounts: items }];
	});

	return {
		filters: { q, archived, currency },
		facets,
		hasAnyAccount: hasAccounts(summary),
		groups
	};
};
