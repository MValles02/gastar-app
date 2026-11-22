import { CURRENCY_OPTIONS, type Currency } from '#lib/money.ts';
import { listRowShown, matchesQuery } from '#lib/list-filter.ts';
import { withBalances, type OriginSum, type TransferIn } from './balance';
import { accountOriginSums, accountTransfersIn, getAccount } from './queries';

/** The account as the detail shows it, with its balance; null when it is not the user's or does not exist. */
export async function accountDetail(userId: string, id: string) {
	const [account] = await getAccount(userId, id);
	if (!account) return null;
	const [sums, ins] = await Promise.all([
		accountOriginSums(userId, { id: account.id }),
		accountTransfersIn(userId, { id: account.id })
	]);
	const [{ balance }] = withBalances([account], sums, ins);
	const { archivedAt, ...rest } = account;
	return { account: { ...rest, archived: archivedAt !== null }, balance };
}

/** The list's drawer facets and the per-currency groups of the rows that pass the filters. */
export function accountList<
	A extends {
		id: string;
		name: string;
		currency: Currency;
		initialBalance: number;
		archivedAt: Date | null;
	}
>(
	all: A[],
	sums: OriginSum[],
	ins: TransferIn[],
	filters: { q: string; archived: boolean; currency: Currency | '' }
) {
	// The drawer counts the staged choice client-side from these (every account, archived included).
	const facets = all.map((a) => ({
		currency: a.currency,
		archived: a.archivedAt !== null,
		match: matchesQuery(a.name, filters.q)
	}));
	const accounts = all.filter((_, i) => listRowShown(facets[i], filters));
	const accountsWithBalance = withBalances(accounts, sums, ins);
	const groups = CURRENCY_OPTIONS.flatMap(({ value: cur, label }) => {
		const items = accountsWithBalance.filter((a) => a.currency === cur);
		if (items.length === 0) return [];
		const total = items.filter((a) => a.archivedAt === null).reduce((s, a) => s + a.balance, 0);
		return [{ currency: cur, label, total, accounts: items }];
	});
	return { facets, groups };
}
