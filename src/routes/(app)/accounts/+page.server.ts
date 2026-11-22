import type { PageServerLoad } from './$types';
import {
	accountOriginSums,
	accountTransfersIn,
	hasAnyAccount,
	listAccounts
} from '#lib/server/accounts/queries.ts';
import { accountList } from '#lib/server/accounts/view.ts';
import { requireUser } from '#lib/server/guards.ts';
import { parseListFilter } from '#lib/list-filter.ts';

const SEARCH_MAX_LENGTH = 40;

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const filters = parseListFilter(url.searchParams, {
		qMax: SEARCH_MAX_LENGTH,
		currencyDefault: ''
	});
	const { q, archived, currency } = filters;

	const [anyAccount, all, sums, ins] = await Promise.all([
		hasAnyAccount(userId),
		listAccounts(userId, { archived: true }),
		accountOriginSums(userId),
		accountTransfersIn(userId)
	]);

	const { facets, groups } = accountList(all, sums, ins, filters);

	return {
		filters: { q, archived, currency },
		facets,
		hasAnyAccount: anyAccount,
		groups
	};
};
