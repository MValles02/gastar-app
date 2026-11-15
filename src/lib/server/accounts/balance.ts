import type { Currency } from '#lib/money.ts';
import type { MovementType } from '#lib/movement.ts';

export type TypeSum = { type: MovementType; amount: number };
export type OriginSum = { accountId: string } & TypeSum;
/** `accountId` is the destination account (null never matches an account). */
export type TransferIn = { accountId: string | null; amount: number };

/** Whether the user has any account (archived included), in `currency` when given, from accountSummary rows. */
export const hasAccounts = (
	summary: { currency: Currency; count: number }[],
	currency?: Currency
): boolean => summary.some((s) => (!currency || s.currency === currency) && s.count > 0);

const sumOf = (sums: TypeSum[], type: MovementType) =>
	sums.filter((s) => s.type === type).reduce((a, s) => a + s.amount, 0);

/** transfersIn = sum of destination_amount of transfers landing in this currency. */
export function totalBalance(initial: number, originSums: TypeSum[], transfersIn: number): number {
	return (
		initial +
		sumOf(originSums, 'income') -
		sumOf(originSums, 'outcome') -
		sumOf(originSums, 'transfer') +
		transfersIn
	);
}

export function monthNet(sums: TypeSum[]): number {
	return sumOf(sums, 'income') - sumOf(sums, 'outcome');
}

/** Balance per account, same formula as the dashboard total (all movements, archived included). */
export function withBalances<A extends { id: string; initialBalance: number }>(
	accounts: A[],
	originSums: OriginSum[],
	transfersIn: TransferIn[]
): (A & { balance: number })[] {
	return accounts.map((a) => ({
		...a,
		balance: totalBalance(
			a.initialBalance,
			originSums.filter((s) => s.accountId === a.id),
			transfersIn.filter((t) => t.accountId === a.id).reduce((n, t) => n + t.amount, 0)
		)
	}));
}
