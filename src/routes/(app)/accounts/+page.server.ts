import type { PageServerLoad } from './$types';
import { accountSummary } from '$lib/server/dashboard-queries';
import { accountOriginSums, accountTransfersIn, listAccounts } from '$lib/server/accounts-queries';
import { withBalances } from '$lib/server/accounts';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 40);
	const raw = url.searchParams.get('currency');
	const currency = raw === 'ARS' || raw === 'USD' ? raw : '';
	const archived = url.searchParams.get('archived') === '1';

	const [summary, accounts, sums, ins] = await Promise.all([
		accountSummary(userId),
		listAccounts(userId, { q, currency: currency || undefined, archived }),
		accountOriginSums(userId),
		accountTransfersIn(userId)
	]);

	const withBal = withBalances(
		accounts,
		sums,
		ins.flatMap((t) => (t.accountId ? [{ ...t, accountId: t.accountId }] : []))
	);
	const groups = (
		[
			['ARS', 'Pesos'],
			['USD', 'Dólares']
		] as const
	).flatMap(([cur, label]) => {
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
